import {
  Wrapper,
  WrapperContent,
  WrapperHeader,
  WrapperTitle,
} from "../../components/Wrapper";
import { AccountForm } from "./AccountForm";

export function Account() {
  return (
    <Wrapper>
      <WrapperHeader>
        <WrapperTitle>Account</WrapperTitle>
      </WrapperHeader>

      <WrapperContent>
        <AccountForm />
      </WrapperContent>
    </Wrapper>
  );
}
