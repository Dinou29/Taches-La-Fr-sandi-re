# Adapter La Frésandière au cahier des charges V2

L’accueil existant et le formulaire générique sont remplacés par une composition compacte et deux pages de saisie distinctes. Le calendrier semaine/mois/année, les post-it et les listes partagent les mêmes interventions ; les jours planifiés sont entourés et les éléments terminés ne remplissent plus les vues actives.

Les entretiens acceptent des pièces jointes PDF/images dans IndexedDB et des liens nommés distincts. Une sauvegarde ZIP contient les données et les fichiers, avec vérification d’intégrité et restauration transactionnelle. Les JSON v1 et leurs anciens champs restent compatibles avec la même clé localStorage. La fréquence reste inconnue à la création, et le renouvellement est idempotent lorsqu’une fréquence est définie.

La palette utilise un bleu canard profond et le combi terracotta/crème. Le CSS est restructuré en une feuille cohérente, sans barre latérale ni navigation fixe devant les formulaires. Les préférences se trouvent dans Paramètres.

Validation effectuée :
- 16 tests modèle et documents réussis : dates, récurrences, compatibilité v1, fichiers, ZIP, corruption et annulation des écritures en cas d’échec du stockage.
- 8 parcours Chromium réussis : formulaires, calendrier, achats, contacts et contrats, sauvegardes, restauration dans un autre contexte navigateur, téléphone et clavier.
- Compilation Vite et construction statique `docs/` réussies.

Limite visuelle : le PNG/SVG authentique `upload/blason.png` et les trois fichiers de maquette cités dans la V2 sont absents de l’environnement. Le blason existant est conservé provisoirement, sans nouvelle génération. La capture Entretien fournie et les descriptions V2 guident les écrans.

Cette branche ne doit pas être fusionnée automatiquement : `main` et l’hébergement GitHub Pages restent inchangés tant que la mise en ligne n’est pas demandée. Aucune donnée personnelle, pièce jointe privée ou sauvegarde utilisateur n’est incluse dans le dépôt.
