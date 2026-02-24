import { EmailPayload } from "../mail.types";

export interface IEmailProvider {
  name: string;
  send(payload: EmailPayload): Promise<any>;
}
