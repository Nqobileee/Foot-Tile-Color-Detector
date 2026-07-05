// Per-mode theming: what each lane's color represents, shown on the wiki
// screen before play. legend is the category label (indexed by LANES[idx]:
// 0=left/red, 1=up/blue, 2=down/yellow, 3=right/green), shown on the wiki
// screen. `names`, where present, is a pool of specific real examples within
// that category — gameplay picks one at random per falling note (e.g. the
// "Apostle" lane shows "Peter", "Paul", "John", ... rather than the literal
// word "Apostle"). Modes without `names` just show their single legend word.
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
    names: [
      ['Chicken', 'Eggs', 'Fish', 'Beans', 'Turkey', 'Tofu', 'Lentils'],
      ['Iron', 'Calcium', 'Zinc', 'Magnesium', 'Potassium', 'Iodine'],
      ['Avocado', 'Olive Oil', 'Nuts', 'Salmon', 'Seeds', 'Coconut'],
      ['Vitamin C', 'Vitamin D', 'Vitamin A', 'Vitamin B12', 'Vitamin E', 'Vitamin K'],
    ],
  },
  {
    id: 'bible',
    title: 'Bible',
    tagline: 'Faith in every step.',
    legend: ['Prophet', 'King', 'Apostle', 'Place'],
    names: [
      ['Isaiah', 'Elijah', 'Jeremiah', 'Moses', 'Samuel', 'Daniel', 'Ezekiel'],
      ['David', 'Solomon', 'Saul', 'Hezekiah', 'Josiah', 'Ahab'],
      ['Peter', 'Paul', 'John', 'Matthew', 'Andrew', 'Thomas', 'James'],
      ['Jerusalem', 'Bethlehem', 'Nazareth', 'Jericho', 'Galilee', 'Bethany'],
    ],
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
    names: [
      ['Lion', 'Elephant', 'Dog', 'Whale', 'Bat', 'Tiger'],
      ['Shark', 'Salmon', 'Tuna', 'Goldfish', 'Trout', 'Catfish'],
      ['Eagle', 'Sparrow', 'Owl', 'Parrot', 'Penguin', 'Flamingo'],
      ['Snake', 'Lizard', 'Turtle', 'Crocodile', 'Iguana', 'Gecko'],
    ],
  },
  {
    id: 'music',
    title: 'Music',
    tagline: 'Feel the beat in every step.',
    legend: ['Bass', 'Drums', 'Vocals', 'Guitar'],
  },
];
