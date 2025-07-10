import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Car, Wrench, Calendar, Users, TrendingUp, Shield } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Landing() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const devLoginMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/auth/user');
      if (!response.ok) throw new Error('Failed to get user');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Login realizado",
        description: "Acesso liberado para teste",
      });
      // Force page reload to trigger authentication check
      window.location.reload();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha no login de desenvolvimento",
        variant: "destructive",
      });
    },
  });

  const handleDevLogin = () => {
    devLoginMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Car className="h-8 w-8 text-green-600 mr-3" />
              <span className="text-2xl font-bold text-gray-900">CarHub</span>
            </div>
            <div className="flex space-x-3">
              <Button 
                onClick={handleDevLogin}
                className="bg-blue-600 hover:bg-blue-700"
                disabled={devLoginMutation.isPending}
              >
                Entrar (Teste)
              </Button>
              <Button 
                onClick={() => window.location.href = '/api/login'}
                className="bg-green-600 hover:bg-green-700"
              >
                Entrar
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Gestão Completa para sua
            <span className="text-green-600 block">Oficina Mecânica</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Automatize e organize o dia-a-dia da sua oficina com nossa plataforma completa. 
            Gerencie clientes, veículos, serviços e muito mais em um só lugar.
          </p>
          <Button 
            size="lg"
            onClick={() => window.location.href = '/api/login'}
            className="bg-green-600 hover:bg-green-700 text-lg px-8 py-3"
          >
            Começar Agora
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Tudo que você precisa para gerenciar sua oficina
            </h2>
            <p className="text-lg text-gray-600">
              Funcionalidades completas para automatizar e otimizar seus processos
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <Users className="h-12 w-12 text-green-600 mb-4" />
                <CardTitle>Gestão de Clientes</CardTitle>
                <CardDescription>
                  Cadastro completo com CPF/CNPJ, histórico de serviços e controle de múltiplos veículos
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Car className="h-12 w-12 text-green-600 mb-4" />
                <CardTitle>Controle de Veículos</CardTitle>
                <CardDescription>
                  Registre todos os veículos dos clientes com histórico completo de manutenções
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Wrench className="h-12 w-12 text-green-600 mb-4" />
                <CardTitle>Gestão de Serviços</CardTitle>
                <CardDescription>
                  Controle completo de ordens de serviço, status e valores com integração de pagamentos
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Calendar className="h-12 w-12 text-green-600 mb-4" />
                <CardTitle>Agenda Inteligente</CardTitle>
                <CardDescription>
                  Agendamento de serviços com notificações automáticas e controle por técnico
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <TrendingUp className="h-12 w-12 text-green-600 mb-4" />
                <CardTitle>Relatórios e Analytics</CardTitle>
                <CardDescription>
                  Dashboard completo com métricas de faturamento, serviços mais populares e muito mais
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Shield className="h-12 w-12 text-green-600 mb-4" />
                <CardTitle>Controle de Acesso</CardTitle>
                <CardDescription>
                  Sistema de perfis com diferentes níveis de acesso para administradores e técnicos
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-green-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Pronto para revolucionar sua oficina?
          </h2>
          <p className="text-xl text-green-100 mb-8">
            Comece hoje mesmo e veja a diferença na organização do seu negócio
          </p>
          <Button 
            size="lg"
            variant="secondary"
            onClick={() => window.location.href = '/api/login'}
            className="text-lg px-8 py-3"
          >
            Acessar Plataforma
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <Car className="h-6 w-6 text-green-600 mr-2" />
            <span className="text-lg font-semibold text-white">CarHub</span>
          </div>
          <p className="text-gray-400">
            © 2024 CarHub. Gestão completa para oficinas mecânicas.
          </p>
        </div>
      </footer>
    </div>
  );
}
