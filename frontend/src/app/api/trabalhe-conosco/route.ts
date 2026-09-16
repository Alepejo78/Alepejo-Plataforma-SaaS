import { NextResponse } from "next/server";

/**
 * Rota própria do Next (não passa pelo backend NestJS do ERP — fora do
 * escopo desta rodada, que é só a parte da página) pra enviar o
 * currículo de "Trabalhe conosco" direto pro Resend, mesmo padrão REST
 * já usado no backend (`email-notifications.service.ts`): anexo em
 * base64, sem precisar do SDK `resend`.
 */

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const SUPPORT_EMAIL = "suporte@alepejo.com.br";

export async function POST(request: Request) {
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { message: "Envio de e-mail não configurado no momento." },
      { status: 503 }
    );
  }

  const formData = await request.formData();
  const email = formData.get("email");
  const curriculo = formData.get("curriculo");

  if (typeof email !== "string" || !email.trim()) {
    return NextResponse.json({ message: "Informe seu e-mail." }, { status: 400 });
  }

  if (!(curriculo instanceof File)) {
    return NextResponse.json({ message: "Anexe o seu currículo." }, { status: 400 });
  }

  if (curriculo.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { message: "O arquivo do currículo deve ter até 5 MB." },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await curriculo.arrayBuffer());

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL ?? "naoresponda@alepejo.com.br",
      to: SUPPORT_EMAIL,
      reply_to: email.trim(),
      subject: "Trabalhe conosco — novo currículo",
      html: `<p>Novo currículo recebido pelo site.</p><p>E-mail do candidato: ${email.trim()}</p>`,
      attachments: [
        {
          filename: curriculo.name,
          content: buffer.toString("base64"),
        },
      ],
    }),
  });

  if (!response.ok) {
    return NextResponse.json(
      { message: "Não foi possível enviar seu currículo. Tente novamente." },
      { status: 502 }
    );
  }

  return NextResponse.json({ sent: true });
}
