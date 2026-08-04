import { api } from "./api";

export interface ClientFilter {
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateClientDto {
  personType: string;
  status: string;
  corporateName: string;
  tradeName?: string;
  document: string;
  stateRegistration?: string;
  municipalRegistration?: string;
  email?: string;
  phone?: string;
  mobilePhone?: string;
  website?: string;
}

export interface UpdateClientDto
  extends Partial<CreateClientDto> {}

export const clientService = {
  async findAll(filter?: ClientFilter) {
    const { data } = await api.get("/clients", {
      params: filter,
    });

    return data;
  },

  async findById(id: string) {
    const { data } = await api.get(
      `/clients/${id}`,
    );

    return data;
  },

  async create(dto: CreateClientDto) {
    const { data } = await api.post(
      "/clients",
      dto,
    );

    return data;
  },

  async update(
    id: string,
    dto: UpdateClientDto,
  ) {
    const { data } = await api.patch(
      `/clients/${id}`,
      dto,
    );

    return data;
  },

  async remove(id: string) {
    const { data } = await api.delete(
      `/clients/${id}`,
    );

    return data;
  },
};