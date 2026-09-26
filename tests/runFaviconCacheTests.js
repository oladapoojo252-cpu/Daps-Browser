// Unit tests for domain extraction and favicon cache logic
function extractDomain(url) {
  if (!url || url === 'home') return '';
  try {
    const formatted = url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
    const parsed = new URL(formatted);
    return parsed.hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    const clean = url.replace(/^https?:\/\//, '').split('/')[0].split('?')[0].split('#')[0];
    return clean.toLowerCase().replace(/^www\./, '');
  }
}

function getLocalFilename(domain) {
  const safeName = domain.replace(/[^a-z0-9_-]/gi, '_');
  return `fav_${safeName}.png`;
}

console.log('====================================================');
console.log('FAVICON CACHE UNIT TESTS');
console.log('====================================================\n');

let pass = 0;
let fail = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`[PASS] ${testName}`);
    pass++;
  } else {
    console.error(`[FAIL] ${testName}`);
    fail++;
  }
}

assert(extractDomain('https://www.google.com/search?q=test') === 'google.com', 'Extract domain from standard https url with query');
assert(extractDomain('http://github.com/torvalds/linux') === 'github.com', 'Extract domain from http url with path');
assert(extractDomain('sub.domain.example.co.uk/page#hash') === 'sub.domain.example.co.uk', 'Extract domain without protocol and with hash');
assert(extractDomain('home') === '', 'Ignore internal home url');
assert(extractDomain('') === '', 'Handle empty url');
assert(getLocalFilename('google.com') === 'fav_google_com.png', 'Generate safe filename for google.com');
assert(getLocalFilename('sub:bad/name?.org') === 'fav_sub_bad_name__org.png', 'Sanitize forbidden characters for disk filename');

console.log('\n----------------------------------------------------');
console.log(`TEST RESULTS: ${pass} / ${pass + fail} PASSED (${Math.round((pass / (pass + fail)) * 100)}%)`);
console.log('----------------------------------------------------\n');

if (fail > 0) process.exit(1);
