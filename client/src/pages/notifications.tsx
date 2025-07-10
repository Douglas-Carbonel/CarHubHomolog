import { useAuth } from "@/hooks/useAuth";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import NotificationSettings from "@/components/notifications/notification-settings";

export default function Notifications() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1">
        <Header />
        <main className="p-6">
          <div className="max-w-2xl mx-auto">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Configurações de Notificação</h1>
              <p className="text-gray-600 mt-2">
                Configure como e quando você deseja receber lembretes de serviços agendados.
              </p>
            </div>
            
            <NotificationSettings />
            
            <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">Como funciona o sistema de lembretes:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Ao criar um serviço, você pode ativar lembretes automáticos</li>
                <li>• As notificações são enviadas diretamente para seu dispositivo</li>
                <li>• Funciona mesmo quando o navegador não está aberto</li>
                <li>• Você escolhe quando receber: 15, 30, 60 ou 120 minutos antes</li>
                <li>• Apenas usuários com permissão adequada recebem os lembretes</li>
              </ul>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}