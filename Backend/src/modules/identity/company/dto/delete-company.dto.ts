import { IsNotEmpty, IsString } from 'class-validator';

/**
 * Confirmação extra pra exclusão FÍSICA de empresa (irreversível): o
 * dono precisa digitar o CNPJ/CPF da empresa de novo, comparado contra
 * `Company.document` no servidor — não é só um "tem certeza?" na tela,
 * é uma trava que o backend também checa.
 *
 * Sem validação de tamanho aqui de propósito — a mensagem de "não
 * confere" que importa vem do `CompanyDeletionService` (compara contra
 * o documento de verdade), mais clara pro usuário do que um erro
 * genérico de tamanho de campo.
 */
export class DeleteCompanyDto {
  @IsString()
  @IsNotEmpty()
  confirmDocument: string;
}
