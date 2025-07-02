type Props = {
  phoneNumber: string;
  phoneCodeHash: string;
  phoneCode: string;
  invoke: any;
  SignIn: new (params: { phoneNumber: string; phoneCodeHash: string; phoneCode: string }) => any;
}

export const loginWithCode = async (props: Props) => {
  const { phoneNumber, phoneCodeHash, phoneCode, invoke, SignIn } = props;

  return await invoke(
    new SignIn({
      phoneNumber: phoneNumber,
      phoneCodeHash: phoneCodeHash,
      phoneCode: phoneCode || ''
    })
  );
}
