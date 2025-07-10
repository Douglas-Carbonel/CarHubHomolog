import { useNotifications } from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Bell, BellOff, TestTube } from "lucide-react";

export default function NotificationSettings() {
  const {
    isSupported,
    isSubscribed,
    isLoading,
    requestPermission,
    unsubscribe,
    sendTestNotification,
  } = useNotifications();

  const permission = Notification.permission;

  const handleToggleNotifications = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await requestPermission();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Configurações de Notificação
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="notifications-toggle">Notificações Push</Label>
            <p className="text-sm text-muted-foreground">
              Receba lembretes 15-30 minutos antes dos serviços agendados
            </p>
          </div>
          <Switch
            id="notifications-toggle"
            checked={isSubscribed}
            onCheckedChange={handleToggleNotifications}
            disabled={isLoading || permission === 'denied'}
          />
        </div>

        {permission === 'denied' && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
            <div className="flex items-center gap-2">
              <BellOff className="h-4 w-4" />
              <span>Notificações bloqueadas pelo navegador</span>
            </div>
            <p className="mt-1">
              Para ativar, vá nas configurações do navegador e permita notificações para este site.
            </p>
          </div>
        )}

        {isSupported && !isSubscribed && permission === 'default' && (
          <div className="text-sm text-blue-600 bg-blue-50 p-3 rounded-md">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span>Ative as notificações para receber lembretes</span>
            </div>
            <p className="mt-1">
              As notificações funcionam mesmo quando o navegador não está aberto.
            </p>
          </div>
        )}

        {isSubscribed && (
          <div className="pt-4 border-t space-y-3">
            <div className="text-sm text-green-600 bg-green-50 p-3 rounded-md">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                <span>Notificações ativadas com sucesso!</span>
              </div>
              <p className="mt-1">
                Você receberá lembretes antes dos serviços agendados.
              </p>
            </div>
            
            <Button
              variant="outline"
              onClick={sendTestNotification}
              className="w-full"
            >
              <TestTube className="h-4 w-4 mr-2" />
              Enviar Notificação de Teste
            </Button>
          </div>
        )}

        {permission === 'default' && !isSubscribed && (
          <div className="text-sm text-blue-600 bg-blue-50 p-3 rounded-md">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span>Clique no botão acima para ativar</span>
            </div>
            <p className="mt-1">
              O navegador solicitará sua permissão para enviar notificações.
            </p>
          </div>
        )}

        {!isSupported && (
          <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-md">
            <div className="flex items-center gap-2">
              <BellOff className="h-4 w-4" />
              <span>Notificações não suportadas</span>
            </div>
            <p className="mt-1">
              Seu navegador não suporta notificações push. Use um navegador moderno como Chrome, Firefox ou Safari.
            </p>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          <p>
            <strong>Como funciona:</strong> Quando você agenda um serviço com lembrete ativado,
            o sistema enviará uma notificação para seu dispositivo antes do horário marcado,
            mesmo se o navegador não estiver aberto.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}