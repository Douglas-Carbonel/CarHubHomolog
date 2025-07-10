import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";

interface UseUnsavedChangesProps {
  hasUnsavedChanges: boolean;
  message?: string;
}

export function useUnsavedChanges({ 
  hasUnsavedChanges, 
  message = "Você tem alterações não salvas. Deseja realmente sair?" 
}: UseUnsavedChangesProps) {
  const [location, setLocation] = useLocation();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingCallback, setPendingCallback] = useState<(() => void) | null>(null);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const originalSetLocation = useRef(setLocation);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };

    if (hasUnsavedChanges) {
      window.addEventListener('beforeunload', handleBeforeUnload);
      
      // Override setLocation to show confirmation
      const interceptedSetLocation = (path: string) => {
        if (hasUnsavedChanges && path !== location) {
          setPendingNavigation(path);
          setShowConfirmDialog(true);
        } else {
          originalSetLocation.current(path);
        }
      };
      
      // This is a bit hacky but works for our use case
      (window as any).__interceptedSetLocation = interceptedSetLocation;
    } else {
      // Restore original navigation
      (window as any).__interceptedSetLocation = null;
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      (window as any).__interceptedSetLocation = null;
    };
  }, [hasUnsavedChanges, message, location]);

  const confirmNavigation = (callback?: () => void) => {
    if (callback) {
      callback();
    } else if (pendingCallback) {
      const callbackToExecute = pendingCallback;
      setPendingCallback(null);
      setPendingNavigation(null);
      setShowConfirmDialog(false);
      callbackToExecute();
      return;
    } else if (pendingNavigation) {
      originalSetLocation.current(pendingNavigation);
    }
    setPendingCallback(null);
    setPendingNavigation(null);
    setShowConfirmDialog(false);
  };

  const cancelNavigation = () => {
    setPendingCallback(null);
    setPendingNavigation(null);
    setShowConfirmDialog(false);
  };

  // Add method to trigger confirmation with custom callback
  const triggerConfirmation = (callback: () => void) => {
    console.log('useUnsavedChanges - triggerConfirmation called, hasUnsavedChanges:', hasUnsavedChanges);
    if (hasUnsavedChanges) {
      console.log('useUnsavedChanges - Setting up confirmation dialog');
      setPendingCallback(() => callback);
      setShowConfirmDialog(true);
    } else {
      console.log('useUnsavedChanges - No unsaved changes, executing callback directly');
      callback();
    }
  };

  return {
    showConfirmDialog,
    confirmNavigation,
    cancelNavigation,
    triggerConfirmation,
    message
  };
}