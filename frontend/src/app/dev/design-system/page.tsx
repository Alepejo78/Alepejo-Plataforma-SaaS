import { Search } from "lucide-react";

import {
  Button,
  Surface,
  Input,
  Typography,
} from "@/components";

export default function DesignSystemPage() {
  return (
    <main className="min-h-screen bg-zinc-100 p-12">
      <div className="mx-auto max-w-7xl space-y-10">
        {/* Cabeçalho */}
        <header className="space-y-2">
          <Typography variant="h1">
            AlePejo UI Kit
          </Typography>

          <Typography variant="body">
            Sprint 1 • Design System
          </Typography>
        </header>

        {/* Buttons */}
        <Surface className="p-8 space-y-6">
          <Typography variant="title">
            Buttons
          </Typography>

          <div className="flex flex-wrap gap-4">
            <Button>Primary</Button>

            <Button variant="secondary">
              Secondary
            </Button>

            <Button variant="outline">
              Outline
            </Button>

            <Button variant="ghost">
              Ghost
            </Button>

            <Button variant="success">
              Success
            </Button>

            <Button variant="danger">
              Danger
            </Button>
          </div>
        </Surface>

        {/* Inputs */}
        <Surface className="p-8 space-y-6">
          <Typography variant="title">
            Inputs
          </Typography>

          <div className="grid max-w-md gap-6">
            <Input
              label="Nome"
              placeholder="Digite seu nome"
            />

            <Input
              label="Pesquisar"
              placeholder="Buscar..."
              leftIcon={<Search size={18} />}
            />

            <Input
              label="E-mail"
              placeholder="Digite seu e-mail"
              helperText="Utilizado para login."
            />

            <Input
              label="CPF"
              placeholder="000.000.000-00"
              error="CPF inválido."
            />
          </div>
        </Surface>
      </div>
    </main>
  );
}