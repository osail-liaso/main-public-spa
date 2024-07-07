

# OSAIL-LAISO 
Open Source Artificial Intelligence Laboratory / Laboratoire d'intelligence artificielle source ouverte

Summary:
The Open Source AI Laboratory / (OSAIL-LIASO) is dedicated to enhancing the accessibility of open source artificial intelligence solutions. It provides a cooperative environment for sharing AI agents, assistants, tools, documentation, and educational resources. OSAIL strives to cultivate a community that promotes interaction among AI experts, developers, and scholars to advance AI technology. Chief Information Officers (CIOs) and Chief Technology Officers (CTOs) can find OSAIL particularly beneficial as it supports their roles in driving technological innovation and strategy within their organizations. The initiative assists in the efforts of various governmental bodies at the federal, provincial, and municipal levels, along with non-profits, NGOs, and other entities, to incorporate AI into their workflows and services.

Engaging with OSAIL means joining a community dedicated to fostering AI in a collaborative and open setting. OSAIL welcomes both seasoned AI practitioners and newcomers to the field to learn, contribute, and influence the trajectory of artificial intelligence.

# Features

- Personal User Accounts: The platform allows individuals to create their own user accounts, which serves as a gateway to access and interact with the various features offered by the platform.

- Advanced AI Model Evaluation: The system provides users with the ability to employ their unique API keys for the integration and detailed assessment of a diverse array of artificial intelligence models and tools.

- In-House Hosting Options: The OSAIL framework is designed for seamless download and integration within private data centers, boasting compatibility with a wide range of databases including MongoDB, Postgres, MySQL, MariaDB, SQLite, DB2, Microsoft SQL Server, and Snowflake, and facilitating straightforward deployment to web applications.

- Fully Open Source Architecture: Constructed with entirely open-source technologies such as Vue.js, Node.js, and PrimeVue, the platform offers a strong and welcoming environment for developers, eliminating the need for any licensing fees for usage or distribution.

- Regular Weekly Updates: The platform ensures that users are consistently informed with weekly updates that highlight the latest in AI developments and enhancements to the platform itself.

- Extensive AI Library: Users have access to a comprehensive library of assistant definitions, which includes a wealth of user feedback and commentary.

- Dual-Language Support: The platform provides assistance in both English and French, adhering to the WCAG 2.1 AA guidelines to ensure accessibility for a broader user base.

- Active Community Engagement: The platform encourages user involvement in its ongoing development by allowing them to submit pull requests via GitHub, fostering a collaborative environment for project improvement.

- Comprehensive Educational Resources: A wide array of educational materials is available on the platform, including tutorials, instructional videos, and live demonstrations, all designed to help users understand and utilize new features and concepts related to artificial intelligence.


## About
OSAIL is built in 2 parts, a Vue.js web interface (this package) and a Node.js server side application.

## Configuration

- VITE_APP_VERSION=$npm_package_version
- VITE_SELF=http://localhost:5173
- VITE_API_URL=http://localhost:3000 
- VITE_WEBSOCKET_URL=ws://localhost:3000
- VITE_STORAGE_URL=https://[my-storage-account].blob.core.windows.net


# Get Involved
1. Join the Community:
   - Register for an OSAIL account to gain access to cutting-edge AI resources.
   - Participate in forums and contribute to collaborative problem-solving within the AI field.
   - Share your own AI projects and insights to inspire others and get constructive critiques.
   - Connect with AI enthusiasts and experts to expand your professional network.
   - Take part in community challenges and hackathons to showcase your skills.
   - Access exclusive community content, webinars, and tutorials to further your AI education.

2. Contribute to Development:
   - Fork the OSAIL codebase on GitHub and set up your development environment.
   - Browse the issue tracker to identify bugs to rectify or features to implement.
   - Engage with the OSAIL community to discuss potential improvements or report issues.
   - Write or improve documentation to help other developers understand and use the codebase effectively.
   - Create tests for existing features to ensure they work as intended and remain stable over time.
   - Review code submissions from other contributors to help maintain a high-quality codebase.
   - Submit your modifications for the OSAIL team's assessment.

3. Share Knowledge:
   - Develop comprehensive guides, tutorials, or educational content to assist users in effectively utilizing the platform.
   - Enhance bilingual support and improve accessibility by translating existing materials into other languages.
   - Organize webinars or live Q&A sessions to address common user questions and issues.
   - Establish a knowledge base or FAQ section for quick reference to frequent inquiries.
   - Foster a community forum where users can exchange tips, tricks, and best practices.
   - Offer personalized training sessions for new users to help them get started with the platform.
   - Create video walkthroughs demonstrating key features and workflows on the platform.

4. Test and Review:
   - Experiment with various AI models and tools available on the platform.
   - Provide ratings and feedback for the assistant definitions in the AI library to guide other users.
   - Analyze the performance of different AI algorithms to determine the best fit for specific tasks.
   - Conduct usability testing to evaluate the user experience and interface design.
   - Engage in A/B testing to compare the outcomes of different AI configurations.
   - Document any bugs or issues encountered during testing to improve the platform's reliability.
   - Collaborate with other platform users to share insights and best practices for AI implementation.
  - Build and test AI trust frameworks and evaluation methods to determine the usefulness of various tools and technologies.


  5. Advocate and Promote:
   - Share your experiences with OSAIL on social media, blogs, and at conferences.
   - Host workshops or meetups to inform others about the advantages and features of OSAIL.
   - Create instructional videos or webinars to demonstrate OSAIL's capabilities.
   - Collaborate with educational institutions to include OSAIL in their curriculum.
   - Write case studies or whitepapers that highlight the successful use of OSAIL in various projects.
   - Engage with online communities and forums to answer questions and provide insights about OSAIL.
   - Partner with influencers or thought leaders to reach a wider audience interested in OSAIL.

   6. Support the Project:
   - Contribute to the backlog by recommending improvements that align with your or your organization's interests.
   - Offer your expertise in areas that can benefit the project's development.
   - Identify and suggest new features that could enhance the project's functionality.
   - Volunteer to test new updates and provide feedback on user experience.
   - Engage with the community to discuss potential directions and ideas for the project's growth.
         
## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Compile and Minify for Production

```sh
npm run build
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```