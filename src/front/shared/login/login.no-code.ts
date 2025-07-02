type Props = {
  id: number;
  hash: string;
  phoneNumber: string;
  connect: () => Promise<boolean>;
  sendCode: (data: { apiId: number; apiHash: string }, phoneNumber: string) => Promise<{ phoneCodeHash: string }>;
}

export const loginWithoutCode = async (props: Props) => {
  const { connect, sendCode, phoneNumber, id, hash } = props;

  await connect();

  const result = await sendCode({ apiId: id, apiHash: hash }, phoneNumber);

  return result;
}
