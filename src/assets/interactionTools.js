//If you want your interactionTools to be controlled by the Web UI, you can define them here.
//Alternatively you can also create a composable and load these from the database using a composable.

//Replace with lexicon composable
import { ref } from 'vue';
import { useLexicon } from '@/composables/useLexicon.js';
const { lng } = useLexicon()

const interactionTools = [
  {
    "version": "1",
    "systemName": "basicChat",
    "path": "/dashboard/interactions/basicchat",
    "icon": "pi pi-fw pi-comment",
    "menu": {
      "en": "Basic Chat",
      "fr": "Chat basique"
    },
    "name": {
      "en": "Basic Chat",
      "fr": "Chat basique"
    },
    "description": {
      "en": "Chat provides the common interaction method popularized by ChatGPT. Interact in a dialogue, attach local files, and download your conversations for future use.",
      "fr": "Le chat offre une méthode d'interaction commune popularisée par ChatGPT. Interagissez dans un dialogue, joignez des fichiers locaux et téléchargez vos conversations pour une utilisation future."
    },
    "videos": [],
    "createdBy": "Janak Alford",
    "momentCreated": "2023-07-03T00:00:00Z",
    "momentLastUpdated": "2023-07-08T00:00:00Z",
    "status": "active",
    "publishStatus": "published",
    "admin": true,
    "models": ["all"]
  },


  {
    "version":"1",
    "systemName":"promptPainter",
    "path": "/dashboard/interactions/promptpainter",
    "icon":"pi pi-fw pi-palette",
    "menu": {
      "en": "Painter", // The sidebar menu name of the tool in English
      "fr": "Peintre" // The sidebar menu name of the tool in French
    },
    "name": {
      "en": "Prompt Painter", // The name of the tool in English
      "fr": "Peintre d'Invite" // The name of the tool in French
    },
    "description": {
      "en": "Prompt Painter is an innovative tool to generate and segment documents or LLM outputs and then interact with each of these segments by applying 'filters' and other controls to expand, contract, summarize, change the tone, or a provide special instructions prompt to otherwise modify the content. When satisfied, your segments collapse back together and download for further editing in Word format.", // Description in English
      "fr": "Le Peintre d'Invite est un outil innovant pour générer et segmenter des documents ou des sorties de modèles de langage, puis pour interagir avec chacun de ces segments en appliquant des 'filtres' et d'autres contrôles afin d'étendre, de réduire, de résumer, de changer le ton, ou de fournir des instructions spéciales pour modifier le contenu. Une fois satisfait, vos segments se rassemblent et peuvent être téléchargés pour une édition ultérieure au format Word." // Description in French
    },
    "videos": ['https://youtu.be/gWccaEqn9n0'], // The name of the person or entity that created the tool
    "createdBy": "Janak Alford / JP Lalonde", // The name of the person or entity that created the tool
    "momentCreated": "2023-07-03T00:00:00Z", // The timestamp when the tool was created
    "momentLastUpdated": "2023-07-08T00:00:00Z", // The timestamp of the last update
    "status": "active", // The status of the tool, can be "active" or "inactive"
    "publishStatus": "published", // The status of the tool, can be "published" or "unpublished". Published means its generally available to all users.
    "admin": false, // A boolean indicating if the tool is for admin use only
    "models": ["all"] // An array of compatible models. All allows any model to use this, or it can be constrained to specific models.
  },



  {
    "version":"1",
    "systemName":"iterativeChunking",
    "path": "/dashboard/interactions/iterativeChunking",
    "icon":"pi pi-fw pi-palette",
    "menu": {
      "en": "Chunking", // The sidebar menu name of the tool in English
      "fr": "Peintre" // The sidebar menu name of the tool in French
    },
    "name": {
      "en": "Iterative Chunking", // The name of the tool in English
      "fr": "Peintre d'Invite" // The name of the tool in French
    },
    "description": {
      "en": "Iterative chunking breaks down any length of text into logical semantic chunks and lets you then perform a final quality assurance", // Description in English
      "fr": "Le Peintre d'Invite est un outil innovant pour générer et segmenter des documents ou des sorties de modèles de langage, puis pour interagir avec chacun de ces segments en appliquant des 'filtres' et d'autres contrôles afin d'étendre, de réduire, de résumer, de changer le ton, ou de fournir des instructions spéciales pour modifier le contenu. Une fois satisfait, vos segments se rassemblent et peuvent être téléchargés pour une édition ultérieure au format Word." // Description in French
    },
    "videos": [], // The name of the person or entity that created the tool
    "createdBy": "Janak Alford ", // The name of the person or entity that created the tool
    "momentCreated": "2023-08-04T00:00:00Z", // The timestamp when the tool was created
    "momentLastUpdated": "2023-08-04T00:00:00Z", // The timestamp of the last update
    "status": "active", // The status of the tool, can be "active" or "inactive"
    "publishStatus": "published", // The status of the tool, can be "published" or "unpublished". Published means its generally available to all users.
    "admin": false, // A boolean indicating if the tool is for admin use only
    "models": ["all"] // An array of compatible models. All allows any model to use this, or it can be constrained to specific models.
  },

  {
    "version":"1",
    "systemName":"personalityBuilder",
    "path": "/dashboard/interactions/personalitybuilder",
    "icon":"pi pi-fw pi-pencil",
    "menu": {
      "en": "Personality Builder",
      "fr": "Constructeur de Personnalité"
    },
    "name": {
      "en": "Personality Builder",
      "fr": "Constructeur de Personnalité"
    },
    "description": {
      "en": "The Personality Framework is a way to build outputs which follow a 10 category personality score based on a framework developed by JP Lalonde.",
      "fr": "Le cadre de personnalité est une méthode pour construire des résultats qui suivent un score de personnalité de 10 catégories basé sur un cadre développé par JP Lalonde."
    },
    "videos": ['https://youtu.be/fXdd965EiEk'],
    "createdBy": "Janak Alford / JP Lalonde",
    "momentCreated": "2023-06-24T00:00:00Z",
    "momentLastUpdated": "2023-06-08T00:00:00Z",
    "status": "active",
    "publishStatus": "published",
    "admin": true,
    "models": ["all"]
  }

];



//Only show the interactionTools ready for publication in the user's preferred language
let activeInteractionTools = interactionTools
  .filter(tool => tool.status === "active" && tool.publishStatus === "published")
  .map(tool => ({ label: tool.name[lng.value], icon: tool.icon, to: tool.path }));

  export { interactionTools, activeInteractionTools }
