/** Envio de documento para assinatura via WhatsApp — sempre por link, nunca anexo/mensagem com PDF. */
export function buildWhatsappSignatureLinkMessage(contractTitle: string, link: string): string {
  return `Fortify: você foi convidado(a) a assinar o documento "${contractTitle}". Acesse pelo link para revisar e assinar: ${link}`;
}
