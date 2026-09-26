import type { LocaleDictionaries } from "../useTranslations";

/** Segmentos do AlePejo Serviços — usado em `/inicio` e `/servicos`. */
export const segmentsDictionary: LocaleDictionaries = {
  "pt-BR": {
    segments: {
      barbearia: "Barbearia",
      salao: "Salão de beleza",
      manicure: "Manicure e esmalteria",
      maquiagem: "Maquiagem",
      estetica: "Estética e depilação",
      bemEstar: "Bem-estar",
      odontologia: "Odontologia",
      clinicaEstetica: "Clínica de estética",
      petshop: "Petshop, banho e tosa",
      esteticaAutomotiva: "Estética automotiva",
    },
  },
  "en-US": {
    segments: {
      barbearia: "Barbershop",
      salao: "Beauty salon",
      manicure: "Manicure & nail salon",
      maquiagem: "Makeup",
      estetica: "Aesthetics & waxing",
      bemEstar: "Wellness",
      odontologia: "Dentistry",
      clinicaEstetica: "Aesthetic clinic",
      petshop: "Pet grooming",
      esteticaAutomotiva: "Auto detailing",
    },
  },
};

/** `ContactSection` — reaproveitado em /inicio, /servicos e /servicos/planos. */
export const contactSectionDictionary: LocaleDictionaries = {
  "pt-BR": {
    contact: {
      defaultTitle: "Fale com a gente",
      defaultDescription: "Tem dúvida sobre os planos ou quer saber mais? Manda uma mensagem.",
      subtitle: "Dúvidas sobre a empresa? Quer saber mais sobre os sistemas? Entre em contato.",
      phoneLabel: "(43) 9 9154-4557",
      addressLabel: "Atendimento remoto em todo o Brasil, presencial a negociar",
      sentTitle: "Mensagem enviada!",
      sentSubtitle: "Vamos responder em breve no e-mail informado.",
      nameLabel: "Nome",
      emailLabel: "E-mail",
      phoneFieldLabel: "Telefone",
      companyLabel: "Empresa",
      messageLabel: "Mensagem",
      sendButton: "Enviar mensagem",
      sending: "Enviando...",
      genericError: "Não foi possível enviar sua mensagem.",
    },
  },
  "en-US": {
    contact: {
      defaultTitle: "Talk to us",
      defaultDescription: "Questions about the plans or want to know more? Send us a message.",
      subtitle: "Questions about the company? Want to know more about the systems? Get in touch.",
      phoneLabel: "+55 (43) 9 9154-4557",
      addressLabel: "Remote support anywhere in Brazil, in-person by arrangement",
      sentTitle: "Message sent!",
      sentSubtitle: "We'll reply soon at the email you provided.",
      nameLabel: "Name",
      emailLabel: "Email",
      phoneFieldLabel: "Phone",
      companyLabel: "Company",
      messageLabel: "Message",
      sendButton: "Send message",
      sending: "Sending...",
      genericError: "We couldn't send your message.",
    },
  },
};

/** `MarketingFooter` — rodapé de /inicio, /servicos e /servicos/planos. */
export const marketingFooterDictionary: LocaleDictionaries = {
  "pt-BR": {
    footer: {
      copyright: "AlePejo Assessoria e Prestação de Serviço Ltda.",
      visits: "visitas",
      privacy: "Política de Privacidade",
    },
  },
  "en-US": {
    footer: {
      copyright: "AlePejo Assessoria e Prestação de Serviço Ltda.",
      visits: "visits",
      privacy: "Privacy Policy",
    },
  },
};
