export const articles = [
  {
    slug: 'what-are-ai-merge-games',
    title: 'What are AI merge games?',
    tag: 'The basics',
    intro:
      'One phrase, a few different ideas. Here is how to tell an original browser mashup from a desktop crossover mod or a merging puzzle.',
    sections: [
      {
        title: 'Start with the kind of combining',
        text: '“AI merge games” can describe AI-assisted game mashups, original games inspired by multiple mechanics, or puzzles that combine elements. Search results can mix these meanings. Look at what a tool actually produces before you sign up or download anything.',
      },
      {
        title: 'What this playground makes',
        text: 'AI Merge Games focuses on original 2D browser games. You name two inspirations and describe the mechanics you want to combine. The planned generator writes a small Canvas game with original geometric artwork. It does not merge the commercial games themselves. Today, three handcrafted examples are available; live generation has not opened.',
      },
      {
        title: 'A useful way to frame a mashup',
        text: 'Instead of asking for a complete copy of two large games, choose one mechanic from each. For example: exploration and resource collection from a sandbox, paired with readable attack patterns from an action game. A small goal, a short play session and clear controls make a first experiment easier to evaluate.',
      },
      {
        title: 'Desktop mashups are a different workflow',
        text: 'Melty describes its mashups as mods that join games, and says they run on games you already own. Its website provides a Windows download. These are the provider’s statements; we have not installed or independently tested its launcher.',
      },
    ],
    sources: [
      { label: 'Melty — official homepage and FAQ', url: 'https://melty.gg/' },
    ],
  },
  {
    slug: 'how-to-make-ai-game-mashups',
    title: 'How to make an AI game mashup',
    tag: 'Getting started',
    intro:
      'Turn two inspirations into a small, clear game idea before you generate anything.',
    sections: [
      {
        title: '1. Pick mechanics, not entire games',
        text: 'Write down what you love about each inspiration. “Explore a tile world” and “dodge slow enemies” are workable ingredients. Replicating an open world, multiplayer networking and a full combat system in one prompt is not a realistic first browser prototype.',
      },
      {
        title: '2. Describe a playable loop',
        text: 'A strong starter brief is: “Explore a small meadow, collect eight seeds, avoid thorns, and reach a gate. Use arrows or WASD to move and one action button to clear nearby hazards.” Specify a goal, a way to lose, and what the action button does.',
      },
      {
        title: '3. Choose two-dimensional constraints',
        text: 'Keep the first version to one screen or a small map, original shapes, and a few mechanics. Our planned generator supports Canvas 2D game logic and does not load external assets or libraries. Try Moss Knight, Portal Hop and Meadow Survivor to see the intended scale.',
      },
      {
        title: '4. Play, observe and restart',
        text: 'Check movement, the main action, the win condition, the loss condition and restart. A game that starts successfully may still need gameplay refinement. Automatic startup checks are a useful first filter, not a guarantee of balance or fun.',
      },
      {
        title: 'Availability',
        text: 'Live generation is not open yet. Our premade examples are available without an account. Once the model connection and end-to-end validation are ready, the same flow will create and save private original games.',
      },
    ],
    sources: [],
  },
  {
    slug: 'browser-mashups-vs-desktop-mods',
    title: 'Browser game mashups vs. desktop mods',
    tag: 'Know the difference',
    intro:
      'Two routes to a crossover idea, with very different outputs and setup.',
    sections: [
      {
        title: 'An original browser game',
        text: 'A browser mashup is its own small game. It may take inspiration from familiar mechanics, but it runs as original code in a webpage. Our examples use simple original shapes and work with keyboard and touch controls. No source game installation is needed.',
      },
      {
        title: 'A mod that runs with existing games',
        text: 'A desktop crossover mod depends on its specific project, supported versions and installation instructions. Melty says its launcher downloads a mashup, installs its requirements and starts the game; it also says users must own the games involved. We have not tested those claims by installing the software.',
      },
      {
        title: 'Choose based on your goal',
        text: 'For a quick creative experiment, start with a browser prototype. For a crossover involving the actual game environments, consult the original mod creator or official launcher documentation and check its requirements. A browser prototype is not a substitute for a working desktop mod.',
      },
      {
        title: 'Check what is actually available',
        text: 'Distinguish playable releases from videos, concept art and planned features. Follow original source links. This site does not host commercial game files, mod installers or third-party executables.',
      },
    ],
    sources: [{ label: 'Melty — official FAQ', url: 'https://melty.gg/' }],
  },
  {
    slug: 'melty-game-mashups',
    title: 'Melty: a guide to the official tool',
    tag: 'Tool notes',
    intro:
      'What the official site says, what to check, and how it differs from this playground.',
    sections: [
      {
        title: 'What Melty describes',
        text: 'Melty presents itself as a way to discover, play and create game mashups and mods. Its homepage shows combinations including SkyCraft and Elden Craft. It says its Windows launcher handles setup and starts the selected mashup.',
      },
      {
        title: 'Requirements and creation',
        text: 'The official FAQ says mashups run on games you own. For creation, the site directs users to give Melty’s instructions to a coding agent. That is different from submitting two game names to this website and receiving an original browser game.',
      },
      {
        title: 'Where to begin',
        text: 'Use the official website for the current download and instructions. We link to the provider instead of mirroring an installer. Availability, supported games and versions can change; consult the original project for the latest requirements.',
      },
      {
        title: 'What we have verified',
        text: 'We reviewed Melty’s public homepage and FAQ on October 16, 2026. We have not downloaded, installed, security-audited or tested the launcher or its mashups. Feature descriptions here are attributed to Melty, not presented as hands-on findings.',
      },
    ],
    sources: [
      {
        label: 'Melty — official website, instructions and FAQ',
        url: 'https://melty.gg/',
      },
    ],
  },
];
