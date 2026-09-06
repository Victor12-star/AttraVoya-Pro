const fs = require('node:fs');

const path = 'apps/web/tests/unit/candidate-evidence-section.test.jsx';
let text = fs.readFileSync(path, 'utf8');
const before = `    expect(screen.getAllByText(copy.notAffordableYet).length).toBeGreaterThan(0);\n    expect(screen.getByText('Published destination summary.')).toBeInTheDocument();`;
const after = `    expect(screen.queryByText(copy.notAffordableYet)).not.toBeInTheDocument();\n    expect(screen.getByText('Published destination summary.')).toBeInTheDocument();`;
if (!text.includes(before)) throw new Error('Missing pre-inspection assertion target');
text = text.replace(before, after);
fs.writeFileSync(path, text);
