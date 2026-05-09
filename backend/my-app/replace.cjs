const fs = require('fs');
const file = 'e:/main data/Desktop/aimodel1/my-app/src/front.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add targetPolicy
content = content.replace(
    'const [isAgeGateOpen, setIsAgeGateOpen] = useState(false);\r\n  const [hasAgreed18, setHasAgreed18] = useState(() => localStorage.getItem(\'age_verified\') === \'true\');',
    'const [isAgeGateOpen, setIsAgeGateOpen] = useState(false);\r\n  const [targetPolicy, setTargetPolicy] = useState(null);\r\n  const [hasAgreed18, setHasAgreed18] = useState(() => localStorage.getItem(\'age_verified\') === \'true\');'
);

// Fallback for \n instead of \r\n
content = content.replace(
    'const [isAgeGateOpen, setIsAgeGateOpen] = useState(false);\n  const [hasAgreed18, setHasAgreed18] = useState(() => localStorage.getItem(\'age_verified\') === \'true\');',
    'const [isAgeGateOpen, setIsAgeGateOpen] = useState(false);\n  const [targetPolicy, setTargetPolicy] = useState(null);\n  const [hasAgreed18, setHasAgreed18] = useState(() => localStorage.getItem(\'age_verified\') === \'true\');'
);

// 2. Update LandingPage
content = content.replace(
    'onOpenPolicies={() => setIsAgeGateOpen(true)}',
    'onOpenPolicies={(section) => { setTargetPolicy(section); setIsAgeGateOpen(true); }}'
);

// 3. Update AgeGateModal
content = content.replace(
    '<AgeGateModal\r\n        isOpen={isAgeGateOpen}\r\n        onDecline={() => {',
    '<AgeGateModal\r\n        isOpen={isAgeGateOpen}\r\n        targetPolicy={targetPolicy}\r\n        clearTargetPolicy={() => setTargetPolicy(null)}\r\n        onDecline={() => {'
);
content = content.replace(
    '<AgeGateModal\n        isOpen={isAgeGateOpen}\n        onDecline={() => {',
    '<AgeGateModal\n        isOpen={isAgeGateOpen}\n        targetPolicy={targetPolicy}\n        clearTargetPolicy={() => setTargetPolicy(null)}\n        onDecline={() => {'
);

// 4. Update CookieBanner
content = content.replace(
    '<CookieBanner onReadPolicy={() => setIsAgeGateOpen(true)} />',
    '<CookieBanner onReadPolicy={() => { setTargetPolicy("cookies"); setIsAgeGateOpen(true); }} />'
);

fs.writeFileSync(file, content);
