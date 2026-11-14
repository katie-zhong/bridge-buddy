// Seeded demo course content. In a pilot this comes from Panopto (transcripts)
// and Brightspace (deadlines) through the adapters in integrations.mjs.

export const COURSES = [
  { id: 'econ101', code: 'ECON 101', title: 'Introductory Microeconomics', exam_label: 'Midterm 1', exam_in_days: 16, theme: 'meadow' },
  { id: 'psyc100', code: 'PSYC 100', title: 'Introduction to Psychology', exam_label: 'Midterm 1', exam_in_days: 9, theme: 'garden' },
  { id: 'math115', code: 'MATH 115', title: 'Linear Algebra for Engineering', exam_label: 'Midterm 1', exam_in_days: 12, theme: 'rocks' },
];

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

const P = (question, answer, keywords) => ({ question, answer, keywords });

export const LECTURES = [
  {
    id: 'econ101-l3', course: 'econ101',
    problems: [
      P('You can spend tonight studying, working a $70 shift, or seeing friends. You rank them in that order. What is the opportunity cost of studying?', 'The $70 shift, because it is the next best option given up.', ['70', 'shift', 'work']),
      P('An economy is producing at a point inside its production possibilities frontier. What could it do?', 'Produce more of both goods, because some resources are unused or wasted.', ['more of both', 'unused', 'waste', 'idle', 'inefficient']),
      P('Moving along the frontier, the economy makes 10 more laptops and 40 fewer loaves. What is the opportunity cost of one laptop?', '4 loaves of bread per laptop.', ['4', 'four']),
    ],
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
    id: 'econ101-l4', course: 'econ101',
    problems: [
      P('Students get a pay rise and buy more coffee at every price. Is that a movement along the demand curve or a shift? Which way?', 'A shift of the whole demand curve to the right, because income changed, not the price of coffee.', ['shift', 'right']),
      P('At $6 a cup, cafes offer 180 cups but students want 90. What do we call this and what happens to the price?', 'A surplus of 90 cups, so the price falls toward equilibrium.', ['surplus', 'fall', 'drop', 'down', 'lower']),
      P('Price rises from $10 to $14 and quantity falls from 70 to 50. Find the elasticity with the midpoint formula.', 'Quantity change is 20 over 60, about 33%. Price change is 4 over 12, about 33%. Elasticity is 1.', ['1', 'one', 'unit']),
      P('A textbook publisher faces inelastic demand and raises its price. What happens to total revenue?', 'Revenue rises, because quantity falls by less than the price goes up.', ['rise', 'increase', 'up', 'more', 'higher']),
    ],
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


// Short lectures that fill out the three demo courses. Each teaches one idea.
const mini = (id, course, title, days_ago, key, c, segs, problems) => {
  CONCEPTS[key] = { ...c, card: [c.riddle, c.note] };
  return { id, course, title, days_ago, seg_seconds: 30, segments: segs.map((text) => L(key, text)), problems };
};

LECTURES.push(
  mini('econ101-l1', 'econ101', 'Lecture 1: Thinking at the margin', 13, 'marginal',
    { title: 'Marginal thinking', hint: 'Ignore the total. Ask only: what does ONE more cost me, and what does it give me?', example: 'A cafe is open anyway. One more coffee costs it 60 cents in beans and milk. If someone will pay $3, selling it is worth it, whatever the rent is.', walkthrough: '1. Find the cost of one more unit (the marginal cost).\n2. Find the gain from one more unit (the marginal benefit).\n3. If the gain is bigger, do one more.\n4. Stop when they are equal.', riddle: 'A cinema has empty seats and one more viewer costs it nothing extra. Should it sell a last-minute ticket for $4 when the normal price is $12? Why?', keywords: ['yes', 'marginal', 'extra', 'more than'], note: 'Decide at the margin: compare the cost and benefit of one more unit, not the totals.' },
    ['Welcome to ECON 101. Economists look at how people choose. The first habit to learn is thinking at the margin. That means asking about one more unit, not the whole thing.', 'Say a cafe is already open. The rent is paid. One more coffee costs only the beans and the milk. We call that the marginal cost.', 'If the customer pays more than that marginal cost, the cafe gains by selling it. So good decisions compare marginal benefit with marginal cost. Totals and past costs do not matter.'],
    [P('A bus is running anyway with empty seats. One more rider costs the company 20 cents. Should it accept a rider who pays $1? Why?', 'Yes. The marginal benefit of $1 is more than the marginal cost of 20 cents.', ['yes', 'marginal', 'more than', 'greater']), P('In one sentence, what is a marginal cost?', 'The extra cost of producing one more unit.', ['one more', 'extra', 'additional'])]),
  mini('econ101-l2', 'econ101', 'Lecture 2: Comparative advantage and trade', 9, 'comparative',
    { title: 'Comparative advantage', hint: 'Do not ask who is better. Ask who gives up LESS to do the job.', example: 'Ana can write a report in 2 hours or fix a bug in 1. Ben needs 3 hours for either. Ben gives up one bug per report; Ana gives up two. So Ben should write reports.', walkthrough: '1. For each person, work out what they give up to make one unit.\n2. The person who gives up less has the **comparative advantage**.\n3. Each makes what they give up least for, then they trade.\n4. Both end up with more.', riddle: 'A surgeon types faster than her assistant. Why might she still pay the assistant to type?', keywords: ['opportunity cost', 'surgery', 'give up', 'operat', 'time'], note: 'Comparative advantage: specialise in what you give up the least to produce, then trade.' },
    ['Today, trade. Why do people and countries trade at all? The answer is comparative advantage. It is about opportunity cost, not about who is best.', 'Suppose Canada can make either wheat or cars more cheaply than another country. It still gains from trade if it focuses on the good where its advantage is biggest.', 'So the rule is this. Each side makes the good it gives up the least to produce. Then they trade, and both sides end up with more than before.'],
    [P('Mia can bake 4 cakes or 8 loaves in a day. Sam can bake 2 cakes or 6 loaves. Who has the comparative advantage in loaves, and why?', 'Sam. He gives up a third of a cake per loaf, Mia gives up half a cake.', ['sam']), P('True or false: a country that is better at making everything gains nothing from trade. Explain.', 'False. It still gains by specialising where its opportunity cost is lowest.', ['false'])]),
  mini('psyc100-l1', 'psyc100', 'Lecture 1: Correlation and causation', 15, 'correlation',
    { title: 'Correlation is not causation', hint: 'Two things rising together does not tell you which one pushes the other, or whether a third thing pushes both.', example: 'Ice cream sales and drownings rise together. Ice cream does not cause drowning. Hot weather causes both.', walkthrough: '1. A **correlation** means two things change together.\n2. A might cause B. B might cause A. Or a third thing, C, might cause both.\n3. Only an **experiment** with random assignment can show cause.', riddle: 'Students who eat breakfast get higher grades. Give one reason this does not prove breakfast raises grades.', keywords: ['third', 'other', 'sleep', 'income', 'cause', 'confound', 'both'], note: 'A correlation shows two things move together. Only an experiment shows cause.' },
    ['Psychology is a science, so we start with method. A correlation means two things tend to change together. More of one goes with more, or less, of the other.', 'But be careful. Ice cream sales and drownings rise together. Ice cream does not cause drowning. A third variable, hot weather, drives both.', 'To show that one thing causes another we need an experiment. We change one thing, assign people at random, and keep everything else the same.'],
    [P('Towns with more churches have more crime. Name a third variable that could explain both.', 'Population size: bigger towns have more of both.', ['population', 'size', 'bigger', 'people', 'larger']), P('What does random assignment do in an experiment?', 'It spreads other differences evenly across groups, so only the thing we changed can explain the result.', ['even', 'equal', 'differences', 'balance', 'only', 'same'])]),
  mini('psyc100-l2', 'psyc100', 'Lecture 2: Neurons and the synapse', 11, 'neuron',
    { title: 'How neurons signal', hint: 'Inside one neuron the signal is electrical. Between two neurons it is chemical.', example: 'Think of a relay race. The runner (electrical signal) carries the baton down the track. At the gap, the baton (neurotransmitter) is passed across to the next runner.', walkthrough: '1. Dendrites receive signals.\n2. If enough arrive, the neuron fires an **action potential** down the axon.\n3. At the end, chemicals called **neurotransmitters** cross the gap, the **synapse**.\n4. They bind to the next neuron and may make it fire.', riddle: 'What carries the signal across the gap between two neurons?', keywords: ['neurotransmitter', 'chemical'], note: 'Signals are electrical along a neuron and chemical (neurotransmitters) across the synapse.' },
    ['The brain is built from cells called neurons. Each neuron has dendrites that receive signals, a cell body, and a long axon that sends signals on.', 'When enough input arrives, the neuron fires. An electrical pulse called an action potential travels down the axon. It is all or nothing.', 'Neurons do not touch. Between them is a tiny gap, the synapse. Chemicals called neurotransmitters cross that gap and pass the message to the next cell.'],
    [P('Put in order: synapse, dendrite, axon. Which part receives, which sends, and where is the gap?', 'Dendrites receive, the axon sends, and the synapse is the gap between neurons.', ['dendrite']), P('What does "all or nothing" mean for an action potential?', 'The neuron either fires fully or not at all. There is no half-strength signal.', ['fully', 'not at all', 'either', 'no half', 'same strength'])]),
  mini('psyc100-l3', 'psyc100', 'Lecture 3: Classical conditioning', 7, 'conditioning',
    { title: 'Classical conditioning', hint: 'Find what caused the reaction BEFORE any learning. Then find the new signal that got paired with it.', example: 'Your phone buzzes (neutral) just before good news arrives (causes a smile). After many pairings, the buzz alone makes you perk up.', walkthrough: '1. An **unconditioned stimulus** causes a reaction with no learning (food, drooling).\n2. Pair a neutral signal with it, again and again (bell, then food).\n3. The signal becomes a **conditioned stimulus**.\n4. Now the signal alone causes the reaction: the **conditioned response**.', riddle: 'A dentist\'s drill sound makes you tense before anything hurts. Which is the conditioned stimulus?', keywords: ['drill', 'sound'], note: 'Conditioning: a neutral signal paired with something meaningful comes to trigger the response alone.' },
    ['Pavlov noticed his dogs drooled before the food arrived. They drooled at the sound of the assistant\'s footsteps. They had learned a link.', 'Food causes drooling with no learning. We call food the unconditioned stimulus. A bell means nothing at first. It is a neutral stimulus.', 'Ring the bell just before food, many times. The bell becomes a conditioned stimulus. Now the bell alone causes drooling, the conditioned response.'],
    [P('A cat runs to the kitchen at the sound of a can opener. Name the conditioned stimulus and the conditioned response.', 'The can opener sound is the conditioned stimulus. Running to the kitchen is the conditioned response.', ['can opener', 'sound']), P('What happens if the bell rings many times with no food?', 'The response fades. This is called extinction.', ['fade', 'extinct', 'stop', 'weaker', 'disappear'])]),
  mini('psyc100-l4', 'psyc100', 'Lecture 4: How memory works', 3, 'memory',
    { title: 'Encoding, storage, retrieval', hint: 'Ask where it went wrong: getting it in, keeping it, or getting it back out.', example: 'You meet someone and forget their name at once: an encoding problem. You know the name is in there but it will not come: a retrieval problem.', walkthrough: '1. **Encoding**: getting information in. Attention matters.\n2. **Storage**: keeping it over time.\n3. **Retrieval**: getting it back out.\n4. Testing yourself strengthens retrieval more than re-reading does.', riddle: 'Why does testing yourself beat re-reading your notes?', keywords: ['retriev', 'practice', 'recall', 'pull'], note: 'Memory has three steps: encoding, storage, retrieval. Self-testing strengthens retrieval.' },
    ['Memory has three stages. Encoding is getting information in. Storage is keeping it. Retrieval is getting it back out when you need it.', 'Working memory is small. It holds only a few items for a few seconds. To keep something, you have to connect it to what you already know.', 'The best way to make a memory last is retrieval practice. Close the book and try to recall. It feels harder than re-reading, and that effort is what makes it stick.'],
    [P('You studied but blank on the exam, then remember the answer on the walk home. Which stage failed?', 'Retrieval. The information was stored but could not be pulled out in the moment.', ['retriev']), P('Give one study habit that uses retrieval practice.', 'Self-testing, for example flashcards or answering questions with the book closed.', ['test', 'flashcard', 'quiz', 'closed', 'recall', 'question'])]),
  mini('math115-l1', 'math115', 'Lecture 1: Vectors and the dot product', 17, 'dot',
    { title: 'The dot product', hint: 'Multiply matching parts, then add the results. You get one number.', example: '(1, 2) · (3, 4) = 1×3 + 2×4 = 3 + 8 = 11.', walkthrough: '1. Line up the two vectors.\n2. Multiply the first entries. Multiply the second entries. And so on.\n3. Add those products.\n4. If the answer is 0, the vectors are at right angles.', riddle: 'Work out (2, 0, 1) · (1, 5, 3).', keywords: ['5', 'five'], note: 'Dot product: multiply matching entries and add. Zero means perpendicular.' },
    ['A vector is a list of numbers. You can picture it as an arrow. We write it in brackets, like one comma two.', 'The dot product takes two vectors and gives one number. Multiply the first entries, multiply the second entries, and add the results.', 'One fact to remember. If the dot product is zero, the two vectors are perpendicular. They meet at a right angle.'],
    [P('Work out (3, 1) · (2, 4).', '3×2 + 1×4 = 10.', ['10', 'ten']), P('The dot product of two vectors is 0. What does that tell you?', 'They are perpendicular (at right angles).', ['perpendicular', 'right angle', 'orthogonal', '90'])]),
  mini('math115-l2', 'math115', 'Lecture 2: Systems of linear equations', 14, 'systems',
    { title: 'Systems of equations', hint: 'A solution has to make EVERY equation true at the same time.', example: 'x + y = 5 and x − y = 1. Add them: 2x = 6, so x = 3. Then y = 2. Check: 3 + 2 = 5 and 3 − 2 = 1.', walkthrough: '1. Write the equations one under the other.\n2. Add or subtract to remove one unknown.\n3. Solve for the one that is left.\n4. Put it back to find the other.\n5. A system has one solution, none, or infinitely many.', riddle: 'Solve x + y = 7 and x − y = 3.', keywords: ['5', '2'], note: 'A system can have one solution, no solution, or infinitely many.' },
    ['A linear system is a set of equations that share the same unknowns. A solution must satisfy all of them at once.', 'Picture two lines on a graph. Usually they cross at one point. That point is the one solution.', 'But parallel lines never cross, so there is no solution. And if the two lines are the same line, there are infinitely many solutions.'],
    [P('Solve 2x + y = 7 and x − y = 2.', 'Add them: 3x = 9, x = 3, then y = 1.', ['3', '1']), P('Two equations describe parallel lines. How many solutions does the system have?', 'None. Parallel lines never meet.', ['none', 'no solution', 'zero', '0'])]),
  mini('math115-l3', 'math115', 'Lecture 3: Row reduction', 10, 'rowreduce',
    { title: 'Row reduction', hint: 'You are allowed three moves only: swap two rows, scale a row, add a multiple of one row to another.', example: 'Rows [1 2 | 5] and [3 4 | 11]. Take row 2 minus 3 × row 1: [0 −2 | −4]. So y = 2, then x = 1.', walkthrough: '1. Write the system as an augmented matrix.\n2. Make a leading 1 in the first row.\n3. Use it to make zeros below it.\n4. Move to the next row and repeat.\n5. Read the answers off from the bottom up.', riddle: 'Name the three row operations you are allowed to use.', keywords: ['swap', 'multiply', 'scale', 'add'], note: 'Row reduce with three moves: swap rows, scale a row, add a multiple of one row to another.' },
    ['Writing equations out in full is slow. So we drop the letters and keep only the numbers in a grid. That grid is the augmented matrix.', 'There are three row operations. Swap two rows. Multiply a row by a number that is not zero. Add a multiple of one row to another row.', 'None of these change the solutions. We use them to make zeros below each leading entry, a staircase shape, and then we read off the answer.'],
    [P('Rows are [1 1 | 4] and [2 3 | 9]. Do row 2 minus 2 × row 1. What is the new row 2?', '[0 1 | 1].', ['0 1 | 1', '0, 1, 1', '0 1 1']), P('Why are row operations safe to use?', 'They do not change the set of solutions.', ['solution', 'same', 'not change', 'equivalent'])]),
  mini('math115-l4', 'math115', 'Lecture 4: Matrix multiplication', 7, 'matmul',
    { title: 'Multiplying matrices', hint: 'Each entry of the answer is one dot product: a ROW of the first with a COLUMN of the second.', example: '[1 2; 3 4] times [5; 6]: top is 1×5 + 2×6 = 17, bottom is 3×5 + 4×6 = 39.', walkthrough: '1. Check sizes: columns of the first must equal rows of the second.\n2. For the entry in row i, column j: take row i of the first and column j of the second.\n3. Take their dot product.\n4. Order matters: AB is usually not BA.', riddle: 'Can you multiply a 2×3 matrix by a 2×2 matrix, in that order? Why or why not?', keywords: ['no', 'columns', 'rows', 'match', '3'], note: 'Matrix product: row of the first dotted with column of the second. AB is usually not BA.' },
    ['To multiply two matrices we do not multiply entry by entry. Each entry of the answer is a dot product.', 'Take a row from the first matrix and a column from the second. Their dot product is one entry of the result.', 'Two warnings. The inner sizes must match: columns of the first, rows of the second. And the order matters. A times B is usually not B times A.'],
    [P('A is 2×3 and B is 3×4. What size is AB?', '2×4.', ['2x4', '2×4', '2 by 4', '2 x 4']), P('Compute [1 2] times the column [3; 4].', '1×3 + 2×4 = 11.', ['11', 'eleven'])]),
  mini('math115-l5', 'math115', 'Lecture 5: Determinants', 4, 'det',
    { title: 'The 2×2 determinant', hint: 'Down-right diagonal minus up-right diagonal: ad − bc.', example: 'For [3 1; 2 4]: 3×4 − 1×2 = 12 − 2 = 10.', walkthrough: '1. Label the matrix [a b; c d].\n2. Multiply a × d.\n3. Multiply b × c.\n4. Subtract: ad − bc.\n5. If the answer is 0, the matrix has no inverse.', riddle: 'Find the determinant of [2 5; 1 3].', keywords: ['1', 'one'], note: 'det [a b; c d] = ad − bc. A zero determinant means no inverse.' },
    ['The determinant is one number we compute from a square matrix. It tells us a lot about that matrix.', 'For a two by two matrix with entries a, b, c, d, the determinant is a times d minus b times c.', 'If the determinant is zero, the matrix squashes space flat. That means it has no inverse, and its system does not have exactly one solution.'],
    [P('Find the determinant of [4 2; 1 3].', '4×3 − 2×1 = 10.', ['10', 'ten']), P('A matrix has determinant 0. Can it be inverted?', 'No. A zero determinant means there is no inverse.', ['no', 'cannot', 'not'])]),
  mini('math115-l6', 'math115', 'Lecture 6: The inverse of a matrix', 1, 'inverse',
    { title: 'The 2×2 inverse', hint: 'Swap a and d, flip the signs of b and c, then divide everything by the determinant.', example: 'For [2 1; 1 1]: determinant is 1. Swap and flip: [1 −1; −1 2]. Divide by 1: same matrix.', walkthrough: '1. Find the determinant ad − bc. If it is 0, stop: no inverse.\n2. Swap a and d.\n3. Change the signs of b and c.\n4. Divide every entry by the determinant.\n5. Check: the matrix times its inverse gives the identity.', riddle: 'What do you get when you multiply a matrix by its inverse?', keywords: ['identity', 'i'], note: 'Inverse of [a b; c d] is (1/det) × [d −b; −c a]. A times its inverse is the identity.' },
    ['The inverse of a matrix undoes it. A matrix times its inverse gives the identity matrix, ones on the diagonal and zeros elsewhere.', 'For a two by two matrix: swap the two diagonal entries, change the sign of the other two, and divide everything by the determinant.', 'That is why a zero determinant is a problem. We would be dividing by zero, so no inverse exists.'],
    [P('Find the inverse of [1 2; 0 1].', '[1 −2; 0 1]. The determinant is 1.', ['-2', '−2']), P('Why does a matrix with determinant 0 have no inverse?', 'The formula divides by the determinant, and you cannot divide by zero.', ['divide', 'zero', '0'])]),
);

export const DEADLINES = [
  { course: 'econ101', title: 'Reading: Chapter 4', in_days: 1, source: 'Brightspace', kind: 'Reading', detail: '22 pages on elasticity. About 50 minutes, or 25 with the summary first.', weight: null, covers: ['econ101-l4'] },
  { course: 'econ101', title: 'Problem set 2: Elasticity', in_days: 2, source: 'Brightspace', kind: 'Assignment', detail: 'Six midpoint-formula questions. Submit as a PDF by 5:00 pm.', weight: 5, covers: ['econ101-l4'] },
  { course: 'psyc100', title: 'Quiz 3: Learning and memory', in_days: 4, source: 'Brightspace', kind: 'Quiz', detail: '15 multiple-choice questions, 20 minutes, one attempt.', weight: 4, covers: ['psyc100-l3', 'psyc100-l4'] },
  { course: 'math115', title: 'WeBWorK set 5', in_days: 6, source: 'Course website', kind: 'Assignment', detail: 'Eight problems on determinants and inverses. Unlimited attempts.', weight: 3, covers: ['math115-l5', 'math115-l6'] },
  { course: 'psyc100', title: 'Midterm 1', in_days: 9, source: 'Outlook calendar', kind: 'Exam', detail: 'Lectures 1 to 4. 50 minutes in RCH 101.', weight: 25, covers: ['psyc100-l1', 'psyc100-l2', 'psyc100-l3', 'psyc100-l4'] },
  { course: 'math115', title: 'Midterm 1', in_days: 12, source: 'Outlook calendar', kind: 'Exam', detail: 'Lectures 1 to 6. 90 minutes. One formula sheet allowed.', weight: 30, covers: ['math115-l1', 'math115-l2', 'math115-l3', 'math115-l4', 'math115-l5', 'math115-l6'] },
  { course: 'econ101', title: 'Midterm 1', in_days: 16, source: 'Outlook calendar', kind: 'Exam', detail: 'Lectures 1 to 4. 80 minutes. Calculations are done by hand.', weight: 25, covers: ['econ101-l1', 'econ101-l2', 'econ101-l3', 'econ101-l4'] },
];

// What gets in the way, described by what the student experiences, never by diagnosis.
// Each detail carries the one strategy Norbu suggests for it, and why.
const D = (key, label, title, how, why, setting) => ({ key, label, strategy: { title, how, why, setting } });
export const AREAS = [
  { key: 'pace', label: 'Keeping up in lectures', details: [
    D('pace-fast', 'The lecturer talks faster than I can follow', 'Flag it and keep listening', 'Press F the moment you are lost. Mend the gap after class.', 'Trying to catch up mid-lecture costs you the next idea too.'),
    D('pace-notes', 'I can\'t listen and take notes at once', 'Let Norbu take the notes', 'Just listen. The transcript is saved and your flags mark what matters.', 'Splitting attention between listening and writing drops both.'),
    D('pace-terms', 'New terms pile up before I get them', 'Preview the summary first', 'Open the lecture summary before class so the new words are not new.', 'A term you have seen once is far easier to follow the second time.'),
  ] },
  { key: 'attention', label: 'Staying focused', details: [
    D('attn-drift', 'I drift off part-way through', 'Ten-minute checkpoints', 'Norbu nudges you every ten minutes of a live lecture.', 'A regular cue brings you back before you have lost the thread.', { checkpoints: true }),
    D('attn-busy', 'Busy screens distract me', 'Focus view', 'Lectures show only the current passage. The side panel is hidden.', 'Less on screen means less to pull your eyes away.', { focus: true }),
    D('attn-return', 'Once I\'m lost I can\'t get back in', 'Flag, then restart at the next passage', 'Flag, take one breath, and pick up from the newest line.', 'Letting go of the missed part is what lets you rejoin.'),
  ] },
  { key: 'reading', label: 'Reading', details: [
    D('read-slow', 'Reading takes me much longer', 'Listen while you read', 'Use Read aloud on any passage or explanation and follow along.', 'Hearing and seeing the words together eases the load of decoding.'),
    D('read-dense', 'I lose my place in dense text', 'Roomier text', 'Bigger text with wider line spacing, everywhere in Bridgeway.', 'Space between lines makes it easier to track where you are.', { spacing: 2, size: 1.1 }),
    D('read-long', 'Long readings feel impossible to start', 'Summary first, details second', 'Read the lecture summary, then only the passages you flagged.', 'Knowing the shape first tells you where each detail belongs.'),
  ] },
  { key: 'writing', label: 'Writing', details: [
    D('write-start', 'I know it but can\'t get it onto the page', 'Say your answer out loud', 'Use the microphone on any answer box. Talk first, tidy later.', 'Speaking skips the step that is getting in your way.'),
    D('write-order', 'My ideas come out in the wrong order', 'Three-bullet outline', 'Type three bullets first: claim, reason, example. Then join them.', 'Ordering three short points is easier than ordering a paragraph.'),
    D('write-spell', 'Spelling slows me down', 'Ideas over spelling', 'Write it however it comes. Norbu checks the idea, not the spelling.', 'Stopping to fix each word breaks your train of thought.'),
  ] },
  { key: 'numbers', label: 'Numbers and formulas', details: [
    D('num-steps', 'I lose track of the steps', 'Full walkthrough first', 'Explanations open with every step shown, one per line.', 'Seeing all the steps laid out frees you from holding them in your head.', { level: 'walkthrough' }),
    D('num-symbols', 'Formulas and symbols blur together', 'Write the formula in words', 'Before any numbers, write the formula as a sentence.', 'Words carry meaning that symbols alone hide.'),
    D('num-slips', 'I make small slips with digits', 'Worked example, then one step at a time', 'Explanations open with a worked example to copy the layout from.', 'A fixed layout makes a slipped digit easy to spot.', { level: 'example' }),
  ] },
  { key: 'planning', label: 'Planning and starting', details: [
    D('plan-start', 'Getting started is the hard part', 'One plank, five minutes', 'Open Bridgeway and renovate one plank. Stopping after one is allowed.', 'A task with a clear end is much easier to begin.'),
    D('plan-time', 'Deadlines sneak up on me', 'Same time every day', 'Set a daily reminder in Settings for a time you are usually free.', 'A fixed time turns starting into a habit, not a decision.'),
    D('plan-big', 'Big tasks feel too big', 'Work from the "Coming up" list', 'Each deadline lists the planks it covers. Do one plank per sitting.', 'Small visible pieces make progress you can see.'),
  ] },
];
export const DETAILS = AREAS.flatMap((a) => a.details.map((d) => ({ ...d, area: a.label })));

// Demo syllabus as it would come out of Brightspace (Content › Course information). Names and
// addresses are invented and use the reserved .example domain. parseSyllabus() reads it.
export const SYLLABUS = `ECON 101 · Introductory Microeconomics · Fall 2026
Course syllabus

TEACHING TEAM
Course instructor: Dr. Amara Okafor <aokafor@northbridge.example>
Teaching assistant: Jonah Reyes <jreyes@northbridge.example>
Instructional support assistant (ISA): Priya Natarajan <pnatarajan@northbridge.example>

OFFICE HOURS
Dr. Amara Okafor: Tuesday 14:00-15:30, Microsoft Teams https://teams.microsoft.com/l/meetup-join/demo-econ101-okafor
Jonah Reyes: Thursday 10:00-11:00, Microsoft Teams https://teams.microsoft.com/l/meetup-join/demo-econ101-reyes-thu
Jonah Reyes: Friday 15:00-16:00, Microsoft Teams https://teams.microsoft.com/l/meetup-join/demo-econ101-reyes-fri
Priya Natarajan: Wednesday 12:00-13:00, Microsoft Teams https://teams.microsoft.com/l/meetup-join/demo-econ101-natarajan

WHO TO CONTACT
Questions about lecture content, readings or problem sets: email your teaching assistant first.
Extensions, missed work, illness or accommodations: email the instructional support assistant.
Grades, regrade requests and anything else: email the course instructor.

GRADING
Problem sets 20%, quizzes 15%, midterm 25%, final exam 40%.`;
