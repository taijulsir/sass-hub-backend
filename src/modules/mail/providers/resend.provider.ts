import { Resend } from "resend";
import { IEmailProvider } from "./email.provider.interface";
import { EmailPayload } from "../mail.types";
import { env } from "../../../config/env";

export class ResendProvider implements IEmailProvider {
  public readonly name = "Resend";
  private resend: Resend;

  constructor() {
    this.resend = new Resend(env.RESEND_API_KEY);
  }

  async send(payload: EmailPayload): Promise<any> {
    const { to, subject, html } = payload;
    const from = env.email.from || "SaaS Hub <onboarding@resend.dev>";

    const { data, error } = await this.resend.emails.send({
      from,
      to,
      subject,
      html,
    });

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }
}
