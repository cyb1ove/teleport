import { FormEventHandler } from 'react';
import { AuthData } from 'shared/api/auth/types';

interface ILoginPageProps {
  handleSubmit: (data: AuthData) => void;
  loginStage: 'name' | 'code' | 'completed';
}

export const LoginPage = (props: ILoginPageProps) => {
  const handleSubmit: FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    
    const phoneNumber = (event.target as HTMLFormElement).phoneNumber.value;
    const phoneCode = (event.target as HTMLFormElement).phoneCode?.value;

    props.handleSubmit({ phoneNumber, phoneCode });
  };

  return (
    <form
      name='login'
      onSubmit={handleSubmit}
    >
      Test
      <input type='text' name='phoneNumber' />
      {props.loginStage === 'code' && <input type='text' name='phoneCode' />}
      <button type='submit'>Send</button>
    </form>
  )
}
