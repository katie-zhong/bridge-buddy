// Seeded demo course content. In a pilot this comes from Panopto (transcripts)
// and Brightspace (deadlines) through the adapters in integrations.mjs.

export const COURSE = {
  id: 'econ101',
  code: 'ECON 101',
  title: 'Introductory Microeconomics',
  exam_label: 'Midterm 1',
  exam_in_days: 16,
};

// Each concept has offline tutor content, used when no Claude API key is set.
export const CONCEPTS = {
  'opportunity-cost': {
    title: 'Opportunity cost',
    hint: 'Ask: when you pick one thing, what is the single best thing you gave up? That one thing is the cost.',
    example:
      'You have one free evening. You can work a shift for $60 or go to a concert. If you go to the concert, the opportunity cost is the $60 you did not earn, not every other thing you could have done.',
    walkthrough:
      '1. List your options.\n2. Rank them by how much you value them.\n3. Pick the top one.\n4. The opportunity cost is the value of the **second** one on the list, the next best choice.\n\nIt is one thing, not the sum of everything you skipped.',
    riddle: 'You spend Saturday studying instead of working a $90 shift or watching films. Films matter less to you than the money. What is the opportunity cost of studying, and why?',
    keywords: ['90', 'shift', 'next best', 'work'],
    note: 'Opportunity cost = the value of the next best option you gave up (one option, not all of them).',
    card: ['What is opportunity cost?', 'The value of the next best alternative you gave up.'],
  },
  ppf: {
    title: 'Production possibilities frontier',
    hint: 'Points on the curve use everything you have. Points inside waste something. Points outside are out of reach for now.',
    example:
      'A bakery can make 100 loaves, or 50 cakes, or a mix. Making 20 cakes might leave room for 70 loaves. The line through those mixes is the frontier.',
    walkthrough:
      '1. Put one good on each axis.\n2. Mark the most you can make of each good alone.\n3. Join the mixes in between. That line is the frontier.\n4. **On** the line: efficient. **Inside**: unused resources. **Outside**: not possible yet.\n5. The slope tells you the opportunity cost of one good in terms of the other.',
    riddle: 'A point sits inside the production possibilities frontier. What does that tell you about how the economy is using its resources?',
    keywords: ['inefficient', 'unused', 'waste', 'not using', 'more of both', 'idle'],
    note: 'PPF: on the curve = efficient, inside = unused resources, outside = unreachable today.',
    card: ['What does a point inside the PPF mean?', 'Resources are unused or wasted. You could make more of both goods.'],
  },
  demand: {
    title: 'The demand curve',
    hint: 'Read the curve one point at a time: "at this price, people want this many."',
    example:
      'At $5 a coffee, students buy 100 cups a day. At $3, they buy 160. Plot both points and join them. The line slopes down because a lower price brings in more buyers.',
    walkthrough:
      '1. Price goes on the vertical axis, quantity on the horizontal.\n2. Each point pairs one price with the quantity people want at that price.\n3. When price falls, quantity demanded rises. That is the **law of demand**.\n4. So the curve slopes downward from left to right.',
    riddle: 'In your own words: why does the demand curve slope downward?',
    keywords: ['price', 'lower', 'more', 'quantity', 'buy', 'falls', 'rises'],
    note: 'Law of demand: lower price, higher quantity demanded, so the curve slopes down.',
    card: ['State the law of demand.', 'When price falls, quantity demanded rises (other things equal).'],
  },
  shift: {
    title: 'Movement along the curve vs. a shift',
    hint: 'Ask one question: did the PRICE of this good change, or did something ELSE change?',
    example:
      'Coffee price drops from $5 to $3: you slide down the same curve (a movement). Exam week arrives and everyone wants more coffee at every price: the whole curve moves right (a shift).',
    walkthrough:
      '1. If the good\'s **own price** changed, you move **along** the curve. We call that a change in *quantity demanded*.\n2. If anything else changed (income, tastes, price of a related good, number of buyers), the **whole curve shifts**. We call that a change in *demand*.\n3. Right shift = more wanted at every price. Left shift = less.',
    riddle: 'Tea gets more expensive, so people buy more coffee. Is that a movement along the coffee demand curve or a shift of it? Say why.',
    keywords: ['shift', 'right', 'substitute', 'not the price of coffee', 'other', 'whole curve'],
    note: 'Own price change = movement along the curve. Anything else = the whole curve shifts.',
    card: ['Price of the good changes. Movement or shift?', 'Movement along the curve. Only non-price changes shift it.'],
  },
  equilibrium: {
    title: 'Market equilibrium',
    hint: 'Find the price where buyers want exactly as much as sellers offer.',
    example:
      'At $4, students want 130 cups and cafes offer 130 cups. Nobody is left waiting and nothing is left over. $4 is the equilibrium price.',
    walkthrough:
      '1. Draw demand (slopes down) and supply (slopes up).\n2. They cross at one point: the **equilibrium**.\n3. Price above it: sellers offer more than buyers want, a **surplus**, so price falls.\n4. Price below it: buyers want more than is offered, a **shortage**, so price rises.\n5. Either way the market is pushed back toward the crossing point.',
    riddle: 'The price is above equilibrium. What do we call the result, and which way does the price move next?',
    keywords: ['surplus', 'fall', 'down', 'drop', 'decrease', 'lower'],
    note: 'Above equilibrium = surplus, price falls. Below = shortage, price rises.',
    card: ['Price is below equilibrium. What happens?', 'A shortage. Buyers want more than is offered, so price rises.'],
  },
  elasticity: {
    title: 'Price elasticity of demand',
    hint: 'Elasticity asks: when price changes a little, do buyers react a lot or a little?',
    example:
      'Price goes up 10% and quantity falls 20%. Elasticity = 20 / 10 = 2. Buyers reacted a lot, so demand is elastic. If quantity fell only 5%, elasticity = 0.5: inelastic.',
    walkthrough:
      '1. Elasticity = **% change in quantity** divided by **% change in price**.\n2. Ignore the minus sign and look at the size.\n3. Bigger than 1: **elastic** (buyers react a lot).\n4. Smaller than 1: **inelastic** (buyers barely react).\n5. Exactly 1: unit elastic.',
    riddle: 'Price rises 10% and quantity demanded falls 5%. What is the elasticity, and is demand elastic or inelastic?',
    keywords: ['0.5', 'inelastic', 'half', '.5'],
    note: 'Elasticity = % change in quantity / % change in price. Above 1 elastic, below 1 inelastic.',
    card: ['Elasticity is 0.4. Elastic or inelastic?', 'Inelastic: it is below 1, so buyers barely react to price.'],
  },
  midpoint: {
    title: 'The midpoint formula',
    hint: 'Use the AVERAGE of the two values as the base for each percentage. That way you get the same answer going up or down.',
    example:
      'Price goes $4 to $6. Quantity goes 120 to 80.\n\n% change in quantity = (80 - 120) / 100 = -40%\n% change in price = (6 - 4) / 5 = 40%\nElasticity = 40 / 40 = 1',
    walkthrough:
      '1. Change in quantity: new minus old.\n2. **Average** quantity: (old + new) / 2.\n3. Divide step 1 by step 2. That is the % change in quantity.\n4. Do the same three steps for price.\n5. Divide the quantity result by the price result. Drop the minus sign.\n\nWhy the average? A move from 4 to 6 is +50% of 4 but only -33% of 6. Using the midpoint (5) gives 40% both ways.',
    riddle: 'Price rises from $8 to $12 and quantity falls from 60 to 40. Using the midpoint formula, what is the elasticity? Show the two percentages.',
    keywords: ['1', '40', 'unit'],
    note: 'Midpoint formula: divide each change by the average of old and new, so the answer is the same in both directions.',
    card: ['Why use the midpoint in the elasticity formula?', 'So the percentage change is the same whether price rises or falls.'],
  },
  revenue: {
    title: 'Elasticity and total revenue',
    hint: 'Revenue = price x quantity. When price goes up, which of the two changes more?',
    example:
      'A cafe sells 100 coffees at $4: revenue $400. It raises the price to $5 and sells 90: revenue $450. Quantity barely moved (inelastic), so revenue went up.',
    walkthrough:
      '1. Total revenue = price x quantity.\n2. Raise the price: price goes up, quantity goes down. Which wins?\n3. **Inelastic** demand: quantity falls only a little, so revenue **rises**.\n4. **Elastic** demand: quantity falls a lot, so revenue **falls**.\n5. Unit elastic: revenue stays the same.',
    riddle: 'A bus company faces inelastic demand. If it raises fares, what happens to its total revenue, and why?',
    keywords: ['rise', 'increase', 'up', 'more', 'higher', 'goes up'],
    note: 'Inelastic demand: raising price raises revenue. Elastic demand: raising price lowers revenue.',
    card: ['Demand is elastic and price rises. Revenue?', 'Revenue falls: quantity drops by more than price rises.'],
  },
};

const L = (concept, text) => ({ concept, text });

export const LECTURES = [
  {
    id: 'econ101-l3',
    title: 'Lecture 3: Scarcity, choice and opportunity cost',
    days_ago: 6,
    seg_seconds: 28,
    segments: [
      L('opportunity-cost', 'Good morning everyone. Today is about choice. Economics starts from one fact: we cannot have everything we want. Time, money and materials are limited. We call that scarcity.'),
      L('opportunity-cost', 'Because of scarcity, every choice has a cost. And the cost is not only money. The real cost of anything is what you give up to get it. We call that the opportunity cost.'),
      L('opportunity-cost', 'Be careful here. The opportunity cost is not everything you could have done instead. It is the single next best alternative. If you come to this lecture instead of working a paid shift, the cost is that shift.'),
      L('opportunity-cost', 'So when I ask for an opportunity cost on the midterm, rank the alternatives first, then name the best one you did not choose. One alternative, clearly stated.'),
      L('ppf', 'Now let us draw this for a whole economy. Imagine an economy that makes only two goods, bread and laptops. We put bread on one axis and laptops on the other.'),
      L('ppf', 'The production possibilities frontier shows every combination the economy can make when it uses all of its resources. Points on the curve are efficient.'),
      L('ppf', 'A point inside the curve means some resources are unused or badly used. A point outside the curve is not possible with what we have today.'),
      L('ppf', 'And the slope of the frontier is the opportunity cost again: how much bread we give up for one more laptop. Same idea, drawn as a picture. Read chapter two for Thursday.'),
    ],
  },
  {
    id: 'econ101-l4',
    title: 'Lecture 4: Demand, equilibrium and elasticity',
    days_ago: 0,
    seg_seconds: 30,
    live_demo: true,
    segments: [
      L('demand', 'Welcome back. Last week we talked about choice. Today we look at how buyers choose in a market. We start with demand.'),
      L('demand', 'Demand is the relationship between the price of a good and how much of it people want to buy. Think of campus coffee. At five dollars a cup, students buy about a hundred cups a day.'),
      L('demand', 'Drop the price to three dollars and they buy about a hundred and sixty. Lower price, more cups. That pattern is the law of demand, and it is why the demand curve slopes downward.'),
      L('shift', 'Now a very common exam mistake. When the price of coffee changes, we move along the same curve. We say the quantity demanded changed. The curve itself stays where it is.'),
      L('shift', 'But if something other than the price changes, say it is exam week and everybody wants more coffee at every price, the whole curve shifts to the right. We say demand increased.'),
      L('shift', 'Income, tastes, the price of substitutes like tea, the number of buyers: all of these shift the curve. Only the good\'s own price moves you along it.'),
      L('equilibrium', 'Sellers have a curve too. Supply slopes upward: a higher price makes cafes willing to sell more. Put the two curves on one graph and they cross.'),
      L('equilibrium', 'That crossing point is the equilibrium. At that price the quantity buyers want equals the quantity sellers offer. For our coffee, say four dollars and a hundred and thirty cups.'),
      L('equilibrium', 'If the price is above equilibrium we get a surplus, unsold coffee, and the price falls. If it is below, we get a shortage, queues, and the price rises.'),
      L('elasticity', 'So far we know the direction: price up, quantity down. Elasticity tells us how much. The price elasticity of demand is the percentage change in quantity divided by the percentage change in price.'),
      L('elasticity', 'If that number is bigger than one, we call demand elastic. Buyers react strongly. If it is smaller than one, demand is inelastic. Buyers barely react. Think petrol or medicine.'),
      L('midpoint', 'There is a catch with percentages. Going from four dollars to six is a fifty percent rise. Going from six back to four is a thirty-three percent fall. Same two prices, different answers.'),
      L('midpoint', 'To fix that we use the midpoint formula. Instead of dividing by the starting value, we divide by the average of the old and the new value. For four and six, the average is five.'),
      L('midpoint', 'So the percentage change in price is two divided by five, forty percent. If quantity goes from a hundred and twenty to eighty, the change is forty over an average of a hundred, also forty percent.'),
      L('midpoint', 'Forty over forty gives an elasticity of one. Unit elastic. You will need to do this by hand on the midterm, so practise it. I will post three problems on Brightspace.'),
      L('revenue', 'Why do firms care? Because of revenue. Total revenue is price times quantity. When you raise the price, the price part goes up and the quantity part goes down.'),
      L('revenue', 'If demand is inelastic, quantity only falls a little, so raising the price raises revenue. If demand is elastic, quantity falls a lot and revenue drops.'),
      L('revenue', 'That is why bus fares and textbooks get price rises, and why cafes run discounts instead. Problem set two is due Friday at five. See you Thursday.'),
    ],
  },
];

export const DEADLINES = [
  { course: 'ECON 101', title: 'Problem set 2: Elasticity', in_days: 2, source: 'Brightspace', kind: 'assignment' },
  { course: 'ECON 101', title: 'Reading: Chapter 4 (22 pages)', in_days: 1, source: 'Brightspace', kind: 'reading' },
  { course: 'PSYC 100', title: 'Quiz 3: Memory', in_days: 4, source: 'Brightspace', kind: 'quiz' },
  { course: 'MATH 115', title: 'WeBWorK set 5', in_days: 6, source: 'Course website', kind: 'assignment' },
  { course: 'ECON 101', title: 'Midterm 1', in_days: 16, source: 'Outlook calendar', kind: 'exam' },
];

// Struggles are described by what the student experiences, never by diagnosis.
export const STRUGGLES = [
  { key: 'pace', label: 'Lectures move too fast for me' },
  { key: 'attention', label: 'I lose the thread part-way through' },
  { key: 'reading', label: 'Readings take me much longer' },
  { key: 'writing', label: 'Getting my thoughts onto the page is hard' },
  { key: 'numbers', label: 'Calculations and formulas trip me up' },
  { key: 'starting', label: 'Starting and planning work is hard' },
];

export const STRATEGIES = [
  { id: 'flag-move', struggle: 'pace', title: 'Flag it and keep listening', how: 'Press F the moment you get lost instead of trying to catch up. Repair the gap after class with the recording.', lift: 0.2 },
  { id: 'preview', struggle: 'pace', title: 'Five-line preview before class', how: 'Read Noor\'s five-line preview of the lecture topics before you walk in, so new words are not new.', lift: 0.12 },
  { id: 'checkpoints', struggle: 'attention', title: 'Ten-minute checkpoints', how: 'Noor nudges you every ten minutes of lecture: still with us? One tap to flag if not.', setting: { checkpoints: true }, lift: 0.17 },
  { id: 'focus', struggle: 'attention', title: 'Focus view', how: 'Show only the current part of the transcript and hide the side panel.', setting: { focus: true }, lift: 0.1 },
  { id: 'listen', struggle: 'reading', title: 'Listen while you read', how: 'Use the read-aloud button on any explanation or passage and follow along with your eyes.', setting: { readAloud: true }, lift: 0.18 },
  { id: 'summary-first', struggle: 'reading', title: 'Summary first, details second', how: 'Open the lecture summary before the full transcript so you know where each detail belongs.', lift: 0.11 },
  { id: 'dictate', struggle: 'writing', title: 'Say your answer out loud', how: 'Use the microphone on riddles and notes. Talk first, tidy the words afterwards.', setting: { dictation: true }, lift: 0.19 },
  { id: 'outline', struggle: 'writing', title: 'Three-bullet outline', how: 'Before a written answer, type three short bullets: claim, reason, example. Then join them up.', lift: 0.13 },
  { id: 'worked', struggle: 'numbers', title: 'Worked example first', how: 'Set support to "Worked example" so every calculation is shown with numbers before you try one.', setting: { level: 'example' }, lift: 0.21 },
  { id: 'units', struggle: 'numbers', title: 'Write the formula in words', how: 'Before any numbers, write the formula as a sentence. Then fill in one value at a time.', lift: 0.12 },
  { id: 'first-plank', struggle: 'starting', title: 'One plank, five minutes', how: 'Open Noor and repair just one plank. Stopping after one is allowed.', lift: 0.16 },
  { id: 'same-time', struggle: 'starting', title: 'Same time every day', how: 'Set a daily reminder for a time you are usually free, so starting is not a decision.', lift: 0.14 },
];
