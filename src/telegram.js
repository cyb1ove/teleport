import { Api, TelegramClient } from "telegram";
import { computeCheck } from "telegram/Password";
import { StringSession } from "telegram/sessions";

// The session string grants full account access, like a password.
// It is kept only in chrome.storage.local and never sent anywhere.
// `login` holds an unfinished login: { step: "code" | "password", phone, phoneCodeHash }.
export async function loadSettings() {
  return chrome.storage.local.get(["apiId", "apiHash", "session", "login"]);
}

export async function saveSettings(values) {
  await chrome.storage.local.set(values);
}

// GramJS bug workaround: every connect() calls session.load(), and StringSession.load()
// restores the auth key from the string it was created with. On a data center switch
// (PHONE_MIGRATE during login) GramJS clears the old key and reconnects, so the old DC's
// key gets sent to the new DC, which rejects it ("Broken authorization key") and the
// request is lost. Loading the string only once lets the new DC get a fresh key.
class ExtensionSession extends StringSession {
  async load() {
    if (this.loaded) return;
    this.loaded = true;
    await super.load();
  }
}

export async function connect({ apiId, apiHash, session }) {
  const client = new TelegramClient(new ExtensionSession(session ?? ""), Number(apiId), apiHash, {
    connectionRetries: 5,
    useWSS: true,
    // GramJS sleeps through FLOOD_WAIT errors shorter than this many seconds.
    floodSleepThreshold: 120,
    // Shown in Telegram → Settings → Devices.
    deviceModel: "Teleport extension",
    systemVersion: navigator.platform || "browser",
    appVersion: "0.1.0",
  });
  // "info" shows data center switches and flood-wait sleeps in the console.
  client.setLogLevel("info");
  await client.connect();
  return client;
}

// Login is split into steps because the popup closes whenever it loses focus (e.g. while
// the user reads the code in Telegram). Each step's result is stored, and the next step
// runs on a fresh client created from the saved session: its auth key is the one the
// code was sent to.

const LOGIN_TIMEOUT_MS = 30_000;

// Runs a login request so that it can't hang silently: FLOOD_WAIT is thrown instead of
// slept through (after many attempts Telegram asks to wait, and GramJS would otherwise
// sleep without a word), and the whole step is capped by a timeout.
async function loginStep(client, run) {
  const threshold = client.floodSleepThreshold;
  client.floodSleepThreshold = 0;
  let timer;
  try {
    return await Promise.race([
      run(),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("Telegram не відповідає. Спробуйте ще раз.")), LOGIN_TIMEOUT_MS);
      }),
    ]);
  } finally {
    clearTimeout(timer);
    client.floodSleepThreshold = threshold;
  }
}

// Where Telegram sent the code, in words for the user.
function describeDelivery(type) {
  if (type instanceof Api.auth.SentCodeTypeApp) return "у застосунок Telegram: чат «Telegram» на іншому вашому пристрої";
  if (type instanceof Api.auth.SentCodeTypeEmailCode) return `на email ${type.emailPattern}`;
  if (type instanceof Api.auth.SentCodeTypeCall) return "голосовим дзвінком";
  if (type instanceof Api.auth.SentCodeTypeFlashCall || type instanceof Api.auth.SentCodeTypeMissedCall) {
    return "дзвінком: код — останні цифри номера, з якого дзвонили";
  }
  if (type instanceof Api.auth.SentCodeTypeFragmentSms) return `через Fragment (${type.url})`;
  if (type instanceof Api.auth.SentCodeTypeSetUpEmailRequired) {
    throw new Error(
      "Telegram вимагає спершу прив'язати email для входу. Зробіть це в офіційному застосунку: " +
        "Налаштування → Конфіденційність → Email для входу, і повторіть.",
    );
  }
  return "SMS-повідомленням";
}

// Returns the login state for the "code" step: { phoneCodeHash, delivery, canResend }.
function toCodeStep(sent) {
  console.log("[teleport] code sent", sent);
  if (sent instanceof Api.auth.SentCodeSuccess) throw new Error("Telegram авторизував сесію без коду. Відкрийте попап ще раз.");
  return {
    phoneCodeHash: sent.phoneCodeHash,
    delivery: describeDelivery(sent.type),
    canResend: Boolean(sent.nextType),
  };
}

export async function sendCode(client, { apiId, apiHash, phone }) {
  const send = () =>
    client.invoke(
      new Api.auth.SendCode({ phoneNumber: phone, apiId: Number(apiId), apiHash, settings: new Api.CodeSettings({}) }),
    );
  return loginStep(client, async () => {
    try {
      return toCodeStep(await send());
    } catch (error) {
      // Telegram asks to start the login over; one retry is enough.
      if (error.errorMessage === "AUTH_RESTART") return toCodeStep(await send());
      throw error;
    }
  });
}

// Asks Telegram to deliver the code another way (the next type it offered, e.g. SMS).
export async function resendCode(client, { phone, phoneCodeHash }) {
  return loginStep(client, async () =>
    toCodeStep(await client.invoke(new Api.auth.ResendCode({ phoneNumber: phone, phoneCodeHash }))),
  );
}

// Login by scanning a QR code in the Telegram app (Settings → Devices → Link Desktop Device).
// Needs no code delivery, so it works when Telegram doesn't deliver login codes.
// Calls onQr(url, expiresAt) for every fresh token; resolves with true when the account
// also needs its 2FA password. Stops early (resolves undefined) once isCancelled() is true.
export async function qrLogin(client, { apiId, apiHash }, { onQr, isCancelled }) {
  // Telegram pushes UpdateLoginToken to this connection once the code is scanned.
  let wake = () => {};
  client.addEventHandler((update) => {
    if (update instanceof Api.UpdateLoginToken) wake();
  });

  try {
    while (!isCancelled()) {
      let result = await client.invoke(
        new Api.auth.ExportLoginToken({ apiId: Number(apiId), apiHash, exceptIds: [] }),
      );
      // The account lives on another data center: finish the login there.
      if (result instanceof Api.auth.LoginTokenMigrateTo) {
        await client._switchDC(result.dcId);
        result = await client.invoke(new Api.auth.ImportLoginToken({ token: result.token }));
      }
      if (result instanceof Api.auth.LoginTokenSuccess) return false;
      if (!(result instanceof Api.auth.LoginToken)) continue;

      const token = result.token.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
      const expiresAt = result.expires * 1000;
      onQr(`tg://login?token=${token}`, expiresAt);
      // Wait for the scan, or for the token to expire and get a new one.
      await new Promise((resolve) => {
        wake = resolve;
        setTimeout(resolve, Math.max(expiresAt - Date.now(), 1000));
      });
    }
  } catch (error) {
    if (error.errorMessage === "SESSION_PASSWORD_NEEDED") return true;
    throw error;
  }
}

// Returns true when the account also needs its 2FA password.
export async function signIn(client, { phone, phoneCodeHash, code }) {
  try {
    const result = await loginStep(client, () =>
      client.invoke(new Api.auth.SignIn({ phoneNumber: phone, phoneCodeHash, phoneCode: code })),
    );
    if (result instanceof Api.auth.AuthorizationSignUpRequired) {
      throw new Error("Цей номер не зареєстрований у Telegram.");
    }
    return false;
  } catch (error) {
    if (error.errorMessage === "SESSION_PASSWORD_NEEDED") return true;
    throw error;
  }
}

export async function getPasswordHint(client) {
  const info = await client.invoke(new Api.account.GetPassword());
  return info.hint ?? "";
}

export async function checkPassword(client, password) {
  await loginStep(client, async () => {
    const info = await client.invoke(new Api.account.GetPassword());
    await client.invoke(new Api.auth.CheckPassword({ password: await computeCheck(info, password) }));
  });
}

export async function resolveChannel(client, ref) {
  if (ref.kind === "username") return client.getEntity(ref.username);

  if (ref.kind === "invite") {
    const invite = await client.invoke(new Api.messages.CheckChatInvite({ hash: ref.hash }));
    if (invite instanceof Api.ChatInviteAlready || invite instanceof Api.ChatInvitePeek) return invite.chat;
    // Joining is a visible action on the user's account, so the prototype never does it automatically.
    throw new Error(`Ви не учасник приватного каналу «${invite.title}». Вступіть до нього в Telegram і повторіть.`);
  }

  // A bare numeric id has no access hash. GramJS can only resolve it once the chat is
  // in its entity cache, which loading the dialog list fills.
  try {
    return await client.getEntity(ref.id);
  } catch {
    await client.getDialogs({});
    return client.getEntity(ref.id);
  }
}

// Yields messages newest first. `limit` of 0 walks the whole history.
export function iterHistory(client, entity, { limit, minId = 0 }) {
  return client.iterMessages(entity, {
    limit: limit > 0 ? limit : undefined,
    minId,
    // Pause between 100-message pages to stay clear of FloodWait on long histories.
    waitTime: 1,
  });
}
