export const PHRASEBOOK_SOURCE_LANGUAGE = 'en';

export const PHRASEBOOK_CATEGORIES = Object.freeze([
  {
    id: 'greetings',
    name: 'Greetings and courtesy',
    phrases: [
      { id: 'hello', text: 'Hello.' },
      { id: 'how-are-you', text: 'How are you?' },
      { id: 'good-morning', text: 'Good morning.' },
      { id: 'good-afternoon', text: 'Good afternoon.' },
      { id: 'good-evening', text: 'Good evening.' },
      { id: 'please', text: 'Please.' },
      { id: 'thank-you', text: 'Thank you.' },
      { id: 'goodbye', text: 'Goodbye.' },
      { id: 'excuse-me', text: 'Excuse me.' },
    ],
  },
  {
    id: 'directions',
    name: 'Directions',
    phrases: [
      { id: 'where-is', text: 'Where is this place?' },
      { id: 'place-called', text: 'What is this place called?' },
      { id: 'go-to-place', text: 'I want to go to this place.' },
      { id: 'help-find-place', text: 'Can you help me find this place?' },
      { id: 'how-get-there', text: 'How do I get there?' },
      { id: 'left-or-right', text: 'Is it left or right?' },
      { id: 'how-far', text: 'How far is it?' },
      { id: 'show-map', text: 'Can you show me on the map?' },
    ],
  },
  {
    id: 'transport',
    name: 'Transport',
    phrases: [
      { id: 'airport', text: 'Where is the airport?' },
      { id: 'station', text: 'Where is the train station?' },
      { id: 'ticket', text: 'I would like one ticket, please.' },
      { id: 'taxi', text: 'Can you call a taxi, please?' },
      { id: 'stop-here', text: 'Please stop here.' },
    ],
  },
  {
    id: 'hotel',
    name: 'Hotel and accommodation',
    phrases: [
      { id: 'reservation', text: 'I have a reservation.' },
      { id: 'check-in', text: 'I would like to check in.' },
      { id: 'wifi', text: 'What is the Wi-Fi password?' },
      { id: 'room-help', text: 'I need help with my room.' },
      { id: 'check-out', text: 'What time is check-out?' },
    ],
  },
  {
    id: 'restaurant',
    name: 'Food and restaurant',
    phrases: [
      { id: 'menu', text: 'May I see the menu, please?' },
      { id: 'water', text: 'Water, please.' },
      { id: 'vegetarian', text: 'Do you have vegetarian food?' },
      { id: 'food-allergy', text: 'I have a food allergy.' },
      { id: 'bill', text: 'The bill, please.' },
    ],
  },
  {
    id: 'shopping',
    name: 'Shopping and payments',
    phrases: [
      { id: 'how-much', text: 'How much is this?' },
      { id: 'card-payment', text: 'Can I pay by card?' },
      { id: 'cash', text: 'Do you accept cash?' },
      { id: 'receipt', text: 'May I have a receipt, please?' },
      { id: 'another-size', text: 'Do you have another size?' },
    ],
  },
  {
    id: 'emergency',
    name: 'Emergency and safety',
    phrases: [
      { id: 'help', text: 'Help, please.' },
      { id: 'can-you-help', text: 'Can you help me, please?' },
      { id: 'police', text: 'Please call the police.' },
      { id: 'lost', text: 'I am lost.' },
      { id: 'passport-lost', text: 'I lost my passport.' },
      { id: 'not-safe', text: 'I do not feel safe.' },
    ],
  },
  {
    id: 'medical',
    name: 'Medical',
    phrases: [
      { id: 'doctor', text: 'I need a doctor.' },
      { id: 'hospital', text: 'Where is the nearest hospital?' },
      { id: 'pharmacy', text: 'Where is the nearest pharmacy?' },
      { id: 'medicine-allergy', text: 'I am allergic to this medicine.' },
      { id: 'pain', text: 'I am in pain.' },
    ],
  },
]);
