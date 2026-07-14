import { BackHandler } from 'react-native';

// Fix para el error de BackHandler.removeEventListener
if (!BackHandler.removeEventListener) {
  console.log("🔧 Aplicando fix para BackHandler.removeEventListener");
  
  let subscriptions = new Map();
  let subscriptionId = 0;

  const originalAddEventListener = BackHandler.addEventListener;
  
  BackHandler.addEventListener = (eventType, handler) => {
    const subscription = originalAddEventListener(eventType, handler);
    const id = ++subscriptionId;
    
    // Crear un objeto que tenga el método remove
    const customSubscription = {
      remove: () => {
        if (subscription && typeof subscription.remove === 'function') {
          subscription.remove();
        } else if (subscription && typeof subscription === 'function') {
          // En algunas versiones, la suscripción es directamente una función
          subscription();
        }
        subscriptions.delete(id);
      }
    };
    
    subscriptions.set(id, customSubscription);
    return customSubscription;
  };

  // Crear removeEventListener como alias del método remove de la suscripción
  BackHandler.removeEventListener = (eventType, handler) => {
    console.warn('BackHandler.removeEventListener is deprecated. Use the subscription object returned by addEventListener().remove() instead.');
    
    // Intentar remover todas las suscripciones como fallback
    subscriptions.forEach((subscription) => {
      if (subscription && typeof subscription.remove === 'function') {
        subscription.remove();
      }
    });
    subscriptions.clear();
  };
}

export default BackHandler;
