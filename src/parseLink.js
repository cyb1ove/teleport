// Turns a URL from the address bar into a channel reference:
//   { kind: "username", username }  — t.me/name, t.me/s/name, web.telegram.org/k/#@name
//   { kind: "id", id }              — t.me/c/123/45, web.telegram.org/a/#-100123
//   { kind: "invite", hash }        — t.me/+hash, t.me/joinchat/hash
// Returns null if the URL doesn't point to a chat.

const TME_HOSTS = new Set(["t.me", "telegram.me", "www.t.me", "www.telegram.me"]);
const RESERVED = new Set(["s", "c", "joinchat", "addstickers", "addemoji", "share", "proxy", "socks", "login"]);
const USERNAME = /^[a-zA-Z][a-zA-Z0-9_]{3,31}$/;

export function parseLink(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }

  if (url.protocol === "tg:") {
    const domain = url.searchParams.get("domain");
    return domain && USERNAME.test(domain) ? { kind: "username", username: domain } : null;
  }

  if (TME_HOSTS.has(url.hostname)) return parseTme(url.pathname);
  if (url.hostname === "web.telegram.org") return parseWebApp(decodeURIComponent(url.hash.slice(1)));
  return null;
}

function parseTme(pathname) {
  const [first, second] = pathname.split("/").filter(Boolean);
  if (!first) return null;

  if (first.startsWith("+")) return { kind: "invite", hash: first.slice(1) };
  if (first === "joinchat" && second) return { kind: "invite", hash: second };
  if (first === "c" && /^\d+$/.test(second ?? "")) return { kind: "id", id: `-100${second}` };
  if (first === "s" && second && USERNAME.test(second)) return { kind: "username", username: second };
  if (!RESERVED.has(first) && USERNAME.test(first)) return { kind: "username", username: first };
  return null;
}

// Web K uses "#@name" or "#-100123"; Web A uses "#-100123" or "#name".
function parseWebApp(hash) {
  const peer = hash.split("?")[0].split("_")[0];
  if (/^-?\d+$/.test(peer)) return { kind: "id", id: peer };
  const name = peer.replace(/^@/, "");
  return USERNAME.test(name) ? { kind: "username", username: name } : null;
}
