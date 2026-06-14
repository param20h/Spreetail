const { parseImportCSV } = require('../src/services/importParser');

describe('CSV Anomaly Detection Engine', () => {
  const members = [
    { name: 'Aisha', joined_at: '2026-01-01', left_at: null },
    { name: 'Rohan', joined_at: '2026-01-01', left_at: null },
    { name: 'Priya', joined_at: '2026-01-01', left_at: null },
    { name: 'Meera', joined_at: '2026-01-01', left_at: '2026-03-31' },
    { name: 'Sam', joined_at: '2026-04-08', left_at: null }
  ];

  test('1. DUPLICATE_ROW (rows 5 & 6 duplicate check)', () => {
    const csvRows = [
      { date: '08-02-2026', description: 'Dinner at Marina Bites', paid_by: 'Dev', amount: '3200', currency: 'INR', split_type: 'equal', split_with: 'Aisha;Rohan;Priya;Dev', split_details: '', notes: 'Dev visiting' },
      { date: '08-02-2026', description: 'dinner - marina bites', paid_by: 'Dev', amount: '3200', currency: 'INR', split_type: 'equal', split_with: 'Aisha;Rohan;Priya;Dev', split_details: '', notes: '' }
    ];
    const result = parseImportCSV(csvRows, members);
    const dup = result.anomalies.find(a => a.issue_type === 'DUPLICATE_ROW');
    expect(dup).toBeDefined();
    expect(dup.row).toBe(3); // First is row 2, second is row 3
    expect(dup.requires_approval).toBe(true);
  });

  test('2. SETTLEMENT_AS_EXPENSE (row 14 paid back)', () => {
    const csvRows = [
      { date: '25-02-2026', description: 'Rohan paid Aisha back', paid_by: 'Rohan', amount: '5000', currency: 'INR', split_type: '', split_with: 'Aisha', split_details: '', notes: 'this is a settlement not an expense??' }
    ];
    const result = parseImportCSV(csvRows, members);
    const anomaly = result.anomalies.find(a => a.issue_type === 'SETTLEMENT_AS_EXPENSE');
    expect(anomaly).toBeDefined();
    expect(anomaly.requires_approval).toBe(true);
    expect(result.parsed_rows[0].is_settlement).toBe(true);
  });

  test('3. COMMA_IN_AMOUNT (row 7 "1,200")', () => {
    const csvRows = [
      { date: '10-02-2026', description: 'Electricity Feb', paid_by: 'Aisha', amount: '1,200', currency: 'INR', split_type: 'equal', split_with: 'Aisha;Rohan;Priya;Meera', split_details: '', notes: '' }
    ];
    const result = parseImportCSV(csvRows, members);
    const anomaly = result.anomalies.find(a => a.issue_type === 'COMMA_IN_AMOUNT');
    expect(anomaly).toBeDefined();
    expect(result.parsed_rows[0].amount).toBe(1200);
  });

  test('4. MISSING_PAYER (row 13 paid_by empty)', () => {
    const csvRows = [
      { date: '22-02-2026', description: 'House cleaning supplies', paid_by: '', amount: '780', currency: 'INR', split_type: 'equal', split_with: 'Aisha;Rohan;Priya;Meera', split_details: '', notes: 'can\'t remember' }
    ];
    const result = parseImportCSV(csvRows, members);
    const anomaly = result.anomalies.find(a => a.issue_type === 'MISSING_PAYER');
    expect(anomaly).toBeDefined();
    expect(anomaly.requires_approval).toBe(true);
    expect(result.parsed_rows.length).toBe(0); // skipped since rowOk is false
  });

  test('5. INCONSISTENT_PAYER_NAME (row 11 Priya S vs Priya)', () => {
    const csvRows = [
      { date: '18-02-2026', description: 'Groceries DMart', paid_by: 'Priya S', amount: '1875', currency: 'INR', split_type: 'equal', split_with: 'Aisha;Rohan;Priya;Meera', split_details: '', notes: '' }
    ];
    const result = parseImportCSV(csvRows, members);
    const anomaly = result.anomalies.find(a => a.issue_type === 'INCONSISTENT_PAYER_NAME');
    expect(anomaly).toBeDefined();
    expect(anomaly.detected_value).toBe('Priya');
    expect(anomaly.requires_approval).toBe(true);
  });

  test('6. CASE_INCONSISTENCY (row 9 priya, row 27 rohan )', () => {
    const csvRows = [
      { date: '14-02-2026', description: 'Snacks', paid_by: 'priya', amount: '640', currency: 'INR', split_type: 'equal', split_with: 'Aisha;Rohan;Priya', split_details: '', notes: '' }
    ];
    const result = parseImportCSV(csvRows, members);
    const anomaly = result.anomalies.find(a => a.issue_type === 'CASE_INCONSISTENCY');
    expect(anomaly).toBeDefined();
    expect(result.parsed_rows[0].paid_by).toBe('Priya');
  });

  test('7. AMBIGUOUS_DATE (row 34 "04-05-2026")', () => {
    const csvRows = [
      { date: '04-05-2026', description: 'Deep cleaning', paid_by: 'Rohan', amount: '2500', currency: 'INR', split_type: 'equal', split_with: 'Aisha;Rohan;Priya', split_details: '', notes: 'is this Apr 5 or May 4' }
    ];
    const result = parseImportCSV(csvRows, members);
    const anomaly = result.anomalies.find(a => a.issue_type === 'AMBIGUOUS_DATE');
    expect(anomaly).toBeDefined();
    expect(anomaly.requires_approval).toBe(true);
  });

  test('8. NON_STANDARD_DATE (row 27 "Mar-14")', () => {
    const csvRows = [
      { date: 'Mar-14', description: 'Airport cab', paid_by: 'Rohan', amount: '1100', currency: 'INR', split_type: 'equal', split_with: 'Aisha;Rohan;Priya;Dev', split_details: '', notes: '' }
    ];
    const result = parseImportCSV(csvRows, members);
    const anomaly = result.anomalies.find(a => a.issue_type === 'NON_STANDARD_DATE');
    expect(anomaly).toBeDefined();
    expect(result.parsed_rows[0].date).toBe('2026-03-14');
  });

  test('9. MISSING_CURRENCY (row 28 blank currency)', () => {
    const csvRows = [
      { date: '15-03-2026', description: 'Groceries', paid_by: 'Priya', amount: '2105', currency: '', split_type: 'equal', split_with: 'Aisha;Rohan;Priya;Meera', split_details: '', notes: '' }
    ];
    const result = parseImportCSV(csvRows, members);
    const anomaly = result.anomalies.find(a => a.issue_type === 'MISSING_CURRENCY');
    expect(anomaly).toBeDefined();
    expect(anomaly.detected_value).toBe('INR');
    expect(result.parsed_rows[0].currency).toBe('INR');
  });

  test('10. ZERO_AMOUNT (row 31 amount=0)', () => {
    const csvRows = [
      { date: '22-03-2026', description: 'Dinner Swiggy', paid_by: 'Priya', amount: '0', currency: 'INR', split_type: 'equal', split_with: 'Aisha;Rohan;Priya;Meera', split_details: '', notes: 'double count' }
    ];
    const result = parseImportCSV(csvRows, members);
    const anomaly = result.anomalies.find(a => a.issue_type === 'ZERO_AMOUNT');
    expect(anomaly).toBeDefined();
    expect(result.parsed_rows.length).toBe(0); // skipped
  });

  test('11. NEGATIVE_AMOUNT (row 26 refund)', () => {
    const csvRows = [
      { date: '12-03-2026', description: 'Refund', paid_by: 'Dev', amount: '-30', currency: 'USD', split_type: 'equal', split_with: 'Aisha;Rohan;Priya;Dev', split_details: '', notes: '' }
    ];
    const result = parseImportCSV(csvRows, members);
    const anomaly = result.anomalies.find(a => a.issue_type === 'NEGATIVE_AMOUNT');
    expect(anomaly).toBeDefined();
    expect(result.parsed_rows[0].amount).toBe(-30);
    expect(result.parsed_rows[0].is_refund).toBe(true);
  });

  test('12. PERCENTAGE_MISMATCH (row 15 percentages sum to 110%)', () => {
    const csvRows = [
      { date: '28-02-2026', description: 'Pizza', paid_by: 'Aisha', amount: '1440', currency: 'INR', split_type: 'percentage', split_with: 'Aisha;Rohan;Priya;Meera', split_details: 'Aisha 30%; Rohan 30%; Priya 30%; Meera 20%', notes: '' }
    ];
    const result = parseImportCSV(csvRows, members);
    const anomaly = result.anomalies.find(a => a.issue_type === 'PERCENTAGE_MISMATCH');
    expect(anomaly).toBeDefined();
    expect(anomaly.requires_approval).toBe(true);
    expect(result.parsed_rows.length).toBe(0); // skipped
  });

  test('13. DUPLICATE_DINNER (rows 24 & 25 same date different amounts)', () => {
    const csvRows = [
      { date: '11-03-2026', description: 'Dinner at Thalassa', paid_by: 'Aisha', amount: '2400', currency: 'INR', split_type: 'equal', split_with: 'Aisha;Rohan;Priya;Dev', split_details: '', notes: '' },
      { date: '11-03-2026', description: 'Thalassa dinner', paid_by: 'Rohan', amount: '2450', currency: 'INR', split_type: 'equal', split_with: 'Aisha;Rohan;Priya;Dev', split_details: '', notes: '' }
    ];
    const result = parseImportCSV(csvRows, members);
    const anomaly = result.anomalies.find(a => a.issue_type === 'DUPLICATE_DINNER');
    expect(anomaly).toBeDefined();
    expect(anomaly.requires_approval).toBe(true);
  });

  test('14. EXTERNAL_PARTICIPANT (rows 5 & 23 Dev, Kabir)', () => {
    const csvRows = [
      { date: '11-03-2026', description: 'Parasailing', paid_by: 'Dev', amount: '150', currency: 'USD', split_type: 'equal', split_with: 'Aisha;Rohan;Priya;Dev;Kabir', split_details: '', notes: '' }
    ];
    const result = parseImportCSV(csvRows, members);
    const anomaly = result.anomalies.filter(a => a.issue_type === 'EXTERNAL_PARTICIPANT');
    expect(anomaly.length).toBeGreaterThan(0);
  });

  test('15. MEERA_AFTER_DEPARTURE (row 36 groceries including Meera after March 31)', () => {
    const csvRows = [
      { date: '02-04-2026', description: 'Groceries', paid_by: 'Priya', amount: '2640', currency: 'INR', split_type: 'equal', split_with: 'Aisha;Rohan;Priya;Meera', split_details: '', notes: 'oops' }
    ];
    const result = parseImportCSV(csvRows, members);
    const anomaly = result.anomalies.find(a => a.issue_type === 'MEERA_AFTER_DEPARTURE');
    expect(anomaly).toBeDefined();
    expect(result.parsed_rows[0].participants).not.toContain('Meera');
  });

  test('16. SAM_BEFORE_JOIN', () => {
    const csvRows = [
      { date: '15-03-2026', description: 'Early Sam Mention', paid_by: 'Aisha', amount: '100', currency: 'INR', split_type: 'equal', split_with: 'Aisha;Sam', split_details: '', notes: '' }
    ];
    const result = parseImportCSV(csvRows, members);
    const anomaly = result.anomalies.find(a => a.issue_type === 'SAM_BEFORE_JOIN');
    expect(anomaly).toBeDefined();
    expect(anomaly.requires_approval).toBe(true);
  });

  test('17. SETTLEMENT_AS_DEPOSIT (row 38 deposit share)', () => {
    const csvRows = [
      { date: '08-04-2026', description: 'Sam deposit share', paid_by: 'Sam', amount: '15000', currency: 'INR', split_type: 'equal', split_with: 'Aisha', split_details: '', notes: 'deposit' }
    ];
    const result = parseImportCSV(csvRows, members);
    const anomaly = result.anomalies.find(a => a.issue_type === 'SETTLEMENT_AS_DEPOSIT');
    expect(anomaly).toBeDefined();
    expect(anomaly.requires_approval).toBe(true);
    expect(result.parsed_rows[0].is_settlement).toBe(true);
  });

  test('18. CONFLICTING_SPLIT_TYPE (row 42 equal but shares provided)', () => {
    const csvRows = [
      { date: '18-04-2026', description: 'Furniture', paid_by: 'Aisha', amount: '12000', currency: 'INR', split_type: 'equal', split_with: 'Aisha;Rohan;Priya;Sam', split_details: 'Aisha 1; Rohan 1; Priya 1; Sam 1', notes: '' }
    ];
    const result = parseImportCSV(csvRows, members);
    const anomaly = result.anomalies.find(a => a.issue_type === 'CONFLICTING_SPLIT_TYPE');
    expect(anomaly).toBeDefined();
    expect(anomaly.requires_approval).toBe(true);
    expect(result.parsed_rows[0].split_type).toBe('share');
  });

  test('19. EXCESS_PRECISION (row 10 899.995)', () => {
    const csvRows = [
      { date: '15-02-2026', description: 'Cylinder refill', paid_by: 'Rohan', amount: '899.995', currency: 'INR', split_type: 'equal', split_with: 'Aisha;Rohan;Priya;Meera', split_details: '', notes: '' }
    ];
    const result = parseImportCSV(csvRows, members);
    const anomaly = result.anomalies.find(a => a.issue_type === 'EXCESS_PRECISION');
    expect(anomaly).toBeDefined();
    expect(result.parsed_rows[0].amount).toBe(900.00);
  });
});
