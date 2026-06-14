const { calculateBalances, simplifyDebts } = require('../src/services/balanceEngine');

describe('Balance Calculation Engine', () => {
  const members = [
    { user_id: '1', name: 'Aisha', joined_at: '2026-01-01', left_at: null },
    { user_id: '2', name: 'Rohan', joined_at: '2026-01-01', left_at: null },
    { user_id: '3', name: 'Priya', joined_at: '2026-01-01', left_at: null },
    { user_id: '4', name: 'Meera', joined_at: '2026-01-01', left_at: '2026-03-31' },
    { user_id: '5', name: 'Sam', joined_at: '2026-04-08', left_at: null }
  ];

  const fxRates = [
    { from_currency: 'USD', to_currency: 'INR', rate: 84.00, effective_date: '2026-01-01' }
  ];

  test('Simple equal split in INR', () => {
    // Rohan paid ₹1200 for Wifi bill, split equal among Aisha, Rohan, Priya, Meera (4 people, ₹300 each)
    const expenses = [
      { id: 'e1', description: 'Wifi bill', amount: 1200, currency: 'INR', paid_by_user_id: '2', date: '2026-02-05' }
    ];
    const splits = [
      { expense_id: 'e1', user_id: '1', amount: 300 },
      { expense_id: 'e1', user_id: '2', amount: 300 },
      { expense_id: 'e1', user_id: '3', amount: 300 },
      { expense_id: 'e1', user_id: '4', amount: 300 }
    ];
    const settlements = [];

    const result = calculateBalances(expenses, splits, settlements, members, fxRates);
    
    // Rohan paid 1200, owes 300 -> net = +900
    // Aisha owes 300 -> net = -300
    // Priya owes 300 -> net = -300
    // Meera owes 300 -> net = -300
    expect(result.per_user_net['2']).toBe(900);
    expect(result.per_user_net['1']).toBe(-300);
    expect(result.per_user_net['3']).toBe(-300);
    expect(result.per_user_net['4']).toBe(-300);

    // Debt simplification should produce 3 transactions paying Rohan
    expect(result.settlements_needed.length).toBe(3);
    const payingRohan = result.settlements_needed.filter(s => s.paid_to === '2');
    expect(payingRohan.length).toBe(3);
    expect(payingRohan[0].amount).toBe(300);
  });

  test('USD expense conversion', () => {
    // Rohan paid $100 USD (8400 INR), split equal among Aisha and Rohan (2 people, 4200 INR each)
    const expenses = [
      { id: 'e1', description: 'Beach lunch', amount: 100, currency: 'USD', paid_by_user_id: '2', date: '2026-03-10' }
    ];
    const splits = [
      { expense_id: 'e1', user_id: '1', amount: 50 },
      { expense_id: 'e1', user_id: '2', amount: 50 }
    ];
    const settlements = [];

    const result = calculateBalances(expenses, splits, settlements, members, fxRates);
    expect(result.per_user_net['2']).toBe(4200); // paid 8400, owes 4200
    expect(result.per_user_net['1']).toBe(-4200); // owes 4200
  });

  test('Time-scoped membership (Meera excluded in April, Sam excluded in March)', () => {
    // April expense (April 10) - Meera shouldn't participate since she left March 31
    // March expense (March 10) - Sam shouldn't participate since he joined April 8
    const expenses = [
      { id: 'e_march', description: 'March dinner', amount: 1000, currency: 'INR', paid_by_user_id: '1', date: '2026-03-10' },
      { id: 'e_april', description: 'April dinner', amount: 800, currency: 'INR', paid_by_user_id: '1', date: '2026-04-10' }
    ];
    const splits = [
      // March splits include Meera, exclude Sam
      { expense_id: 'e_march', user_id: '1', amount: 250 },
      { expense_id: 'e_march', user_id: '2', amount: 250 },
      { expense_id: 'e_march', user_id: '3', amount: 250 },
      { expense_id: 'e_march', user_id: '4', amount: 250 },
      { expense_id: 'e_march', user_id: '5', amount: 250 }, // Sam (inactive on Mar 10)

      // April splits include Sam, exclude Meera
      { expense_id: 'e_april', user_id: '1', amount: 200 },
      { expense_id: 'e_april', user_id: '2', amount: 200 },
      { expense_id: 'e_april', user_id: '3', amount: 200 },
      { expense_id: 'e_april', user_id: '4', amount: 200 }, // Meera (inactive on Apr 10)
      { expense_id: 'e_april', user_id: '5', amount: 200 }
    ];
    
    const result = calculateBalances(expenses, splits, [], members, fxRates);
    
    // Sam's balance should only reflect April expense splits
    // Debited 200 for e_april. Sam split for e_march (250) is excluded since he joined Apr 8.
    expect(result.per_user_net['5']).toBe(-200);

    // Meera's balance should only reflect March expense splits
    // Debited 250 for e_march. Meera split for e_april (200) is excluded since she left Mar 31.
    expect(result.per_user_net['4']).toBe(-250);
  });

  test('Settlements impact on balance', () => {
    // Rohan paid ₹1200 (Wifi), Aisha owes Rohan ₹300.
    // Aisha settles up with Rohan for ₹300.
    const expenses = [
      { id: 'e1', description: 'Wifi bill', amount: 1200, currency: 'INR', paid_by_user_id: '2', date: '2026-02-05' }
    ];
    const splits = [
      { expense_id: 'e1', user_id: '1', amount: 300 },
      { expense_id: 'e1', user_id: '2', amount: 300 },
      { expense_id: 'e1', user_id: '3', amount: 300 },
      { expense_id: 'e1', user_id: '4', amount: 300 }
    ];
    const settlements = [
      { id: 's1', paid_by: '1', paid_to: '2', amount: 300, currency: 'INR', date: '2026-02-10' }
    ];

    const result = calculateBalances(expenses, splits, settlements, members, fxRates);
    expect(result.per_user_net['1']).toBe(0); // Aisha is settled up
    expect(result.per_user_net['2']).toBe(600); // Rohan is owed 600 instead of 900
  });

  test('simplifyDebts greedy matching', () => {
    const net = {
      '1': -100, // Aisha owes 100
      '2': 150,  // Rohan is owed 150
      '3': -50,  // Priya owes 50
    };
    const simplified = simplifyDebts(net, members);
    expect(simplified.length).toBe(2);
    // Aisha pays Rohan 100
    // Priya pays Rohan 50
    const aishaToRohan = simplified.find(s => s.paid_by === '1' && s.paid_to === '2');
    const priyaToRohan = simplified.find(s => s.paid_by === '3' && s.paid_to === '2');
    expect(aishaToRohan.amount).toBe(100);
    expect(priyaToRohan.amount).toBe(50);
  });
});
