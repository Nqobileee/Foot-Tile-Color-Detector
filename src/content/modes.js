// Per-mode theming: what each lane's color represents, shown on the wiki
// screen before play. Gameplay itself never changes — same 4 lanes, same
// colors, same arrows — only the conceptual meaning shown to the player
// does. legend is indexed by LANES[idx] (0=left/red, 1=up/blue, 2=down/
// yellow, 3=right/green).
export const GAME_MODES = [
  {
    id: 'normal',
    title: 'Normal',
    tagline: 'Classic reflex play — no theme, just directions.',
    legend: ['Left', 'Up', 'Down', 'Right'],
  },
  {
    id: 'nutrition',
    title: 'Nutrition',
    tagline: 'Fuel your body right.',
    legend: ['Protein', 'Minerals', 'Fats', 'Vitamins'],
  },
  {
    id: 'bible',
    title: 'Bible',
    tagline: 'Faith in every step.',
    legend: ['Prophet', 'King', 'Apostle', 'Place'],
  },
  {
    id: 'solar-system',
    title: 'Solar System',
    tagline: 'Step through the planets.',
    legend: ['Mars', 'Neptune', 'Sun', 'Earth'],
  },
  {
    id: 'emotions',
    title: 'Emotions',
    tagline: 'Name that feeling.',
    legend: ['Angry', 'Sad', 'Happy', 'Calm'],
  },
  {
    id: 'weather',
    title: 'Weather',
    tagline: 'Every season, one step at a time.',
    legend: ['Heat', 'Rain', 'Sunshine', 'Spring'],
  },
  {
    id: 'animal-kingdom',
    title: 'Animal Kingdom',
    tagline: 'Which class am I stepping on?',
    legend: ['Mammals', 'Fish', 'Birds', 'Reptiles'],
  },
  {
    id: 'music',
    title: 'Music',
    tagline: 'Feel the beat in every step.',
    legend: ['Bass', 'Drums', 'Vocals', 'Guitar'],
  },
];
