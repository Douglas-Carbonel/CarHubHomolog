import { useEffect, useState } from 'react';
import { notificationManager } from '@/lib/notifications';
import { useToast } from '@/hooks/use-toast';

export function useNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const initializeNotifications = async () => {
      try {
        const initialized = await notificationManager.initialize();
        setIsSupported(initialized);

        if (initialized) {
          const subscribed = await notificationManager.isSubscribed();
          setIsSubscribed(subscribed);
          console.log('Notification status:', { initialized, subscribed });
        }
      } catch (error) {
        console.error('Error initializing notifications:', error);
        setIsSupported(false);
      }
    };

    initializeNotifications();
  }, []);

  const requestPermission = async () => {
    setIsLoading(true);
    try {
      console.log('Requesting notification permission...');

      // First check if we already have permission
      if (Notification.permission === 'granted') {
        console.log('Permission already granted, subscribing...');
        const success = await notificationManager.subscribe();

        if (success) {
          setIsSubscribed(true);
          toast({
            title: "Notificações ativadas",
            description: "Você receberá notificações de lembretes de serviços.",
          });
        } else {
          toast({
            variant: "destructive",
            title: "Erro na inscrição",
            description: "Não foi possível se inscrever nas notificações.",
          });
        }
        return;
      }

      // Request permission
      const hasPermission = await notificationManager.requestPermission();
      console.log('Permission result:', hasPermission);

      if (hasPermission) {
        const success = await notificationManager.subscribe();
        console.log('Subscription result:', success);

        if (success) {
          setIsSubscribed(true);
          toast({
            title: "Notificações ativadas",
            description: "Você receberá notificações de lembretes de serviços.",
          });
        } else {
          toast({
            variant: "destructive",
            title: "Erro na inscrição",
            description: "Não foi possível se inscrever nas notificações.",
          });
        }
      } else {
        toast({
          variant: "destructive",
          title: "Permissão negada",
          description: "Permissão para notificações foi negada. Ative nas configurações do navegador.",
        });
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Ocorreu um erro ao solicitar permissão para notificações.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribe = async () => {
    setIsLoading(true);

    try {
      const success = await notificationManager.unsubscribe();

      if (success) {
        setIsSubscribed(false);
        toast({
          title: "Notificações desativadas",
          description: "Você não receberá mais notificações push.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Não foi possível desativar as notificações.",
        });
      }
    } catch (error) {
      console.error('Error unsubscribing:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Ocorreu um erro ao desativar as notificações.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sendTestNotification = async () => {
    try {
      const success = await notificationManager.sendTestNotification();

      if (success) {
        toast({
          title: "Notificação de teste enviada",
          description: "Verifique se recebeu a notificação no seu dispositivo.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Não foi possível enviar a notificação de teste.",
        });
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Ocorreu um erro ao enviar a notificação de teste.",
      });
    }
  };

  const subscribe = async () => {
    setIsLoading(true);
    try {
      const hasPermission = await notificationManager.requestPermission();

      if (!hasPermission) {
        toast({
          variant: "destructive",
          title: "Permissão negada",
          description: "Não foi possível obter permissão para notificações.",
        });
        return;
      }

      const success = await notificationManager.subscribe();

      if (success) {
        setIsSubscribed(true);
        toast({
          title: "Notificações ativadas",
          description: "Você receberá lembretes antes dos serviços agendados.",
        });

        // Force refresh subscription status
        //await checkSubscriptionStatus();
      } else {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Não foi possível ativar as notificações. Tente novamente.",
        });
      }
    } catch (error) {
      console.error('Error subscribing:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Ocorreu um erro ao ativar as notificações.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isSupported,
    isSubscribed,
    isLoading,
    requestPermission,
    unsubscribe,
    sendTestNotification,
    subscribe
  };
}