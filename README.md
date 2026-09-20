# PWA - Atelier pratique 2

## Contexte

Maintenant que notre application est fonctionnelle en ligne, nous allons permettre à l'utilisateur de l'utiliser hors ligne.  
Pour cela, nous allons utiliser les Service Workers.

En plus des fonctionnalités hors ligne, nous allons ajouter un système de communication entre utilisateurs avec des notifications push pour les nouveaux messages.

Pour que l'application soit disponible partout, il sera nécessaire de la déployer sur un serveur en ligne.

## Étapes à réaliser

1. Mettre en place la synchronisation des données
   - Lorsque l'utilisateur est en ligne, les données doivent être synchronisées avec le serveur
   - Lorsque l'utilisateur est hors ligne, les données doivent être stockées en local _(localStorage)_
   - À la remise en ligne, les données locales doivent être synchronisées avec le serveur
2. Mettre en place le système de communication
   - Ajouter un champ de texte pour saisir un message
   - Ajouter un bouton pour envoyer le message
   - Afficher les messages envoyés
   - Ajouter un système de notifications push pour les nouveaux messages
3. Mettre en place le déploiement de l'application
   - Déployer l'application sur un serveur en ligne
   - Tester l'application en ligne et hors ligne
   - Vérifier que les notifications push fonctionnent

## Informations utiles

- Le fichier `api.js` permet maintenant de gérer toute la partie communication entre l'application et le serveur _(ajout, modification, suppression de notes et de messages)_
- Pour mettre en place les notifications push, vous pouvez vous inspirer de la documentation de Mozilla : [Notifications API](https://developer.mozilla.org/fr/docs/Web/API/Notifications_API)
# pprojetct2
