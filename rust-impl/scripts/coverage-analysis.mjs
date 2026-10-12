export const groupId = group => `${group.file}:${group.line}`;
export const isTestCase = group => group.kind === 'it' || group.kind === 'it.skip';
const isSuite = group => group.kind === 'describe' || group.kind === 'describe.skip';

export function fixtureEvidence(ids, results, mode) {
  const fixtures = [...new Set(ids)];
  const observations = fixtures.map(id => results.get(id)).filter(Boolean);
  return {
    status: !fixtures.length ? 'uncovered' : !observations.length ? 'fixtures-present-unverified'
      : observations.some(r => r.pass !== true) ? 'observed-failure'
        : observations.length < fixtures.length ? 'partially-verified'
          : mode === 'parity' ? 'parity-passed-fixtures' : 'js-passed-rust-unverified',
    fixtures,
    ...(observations.length ? {observed: observations.length, passed: observations.filter(r => r.pass === true).length} : {}),
  };
}

// A fixture linked to a suite never proves its unlinked children. Suites roll
// up all descendant cases; the strict coverage denominator counts leaves once.
export function sourceCoverage(inventory, fixtures, evidence, scope) {
  const errors = [];
  const byId = new Map();
  const invalid = new Set();
  for (const group of inventory) {
    const id = groupId(group);
    if (!group.file || !Number.isSafeInteger(group.line) || group.line < 1 || !group.name
      || (group.endLine !== undefined && (!Number.isSafeInteger(group.endLine) || group.endLine < group.line))
      || (!isTestCase(group) && !isSuite(group)) || byId.has(id)) {
      errors.push({id, reason: 'Invalid or duplicate source-test declaration'});
      invalid.add(id);
    }
    byId.set(id, group);
  }
  for (const group of [...inventory].sort((a, b) => a.line - b.line)) {
    if (!group.parent) continue;
    const parent = byId.get(group.parent);
    // Requiring an earlier same-file suite also rejects self-links and cycles.
    if (!parent || !isSuite(parent) || parent.file !== group.file || parent.line >= group.line || invalid.has(group.parent)
      || (parent.endLine !== undefined && (group.endLine ?? group.line) > parent.endLine)) {
      errors.push({id: groupId(group), reason: 'Invalid source-test parent; expected an earlier same-file suite'});
      invalid.add(groupId(group));
    }
  }
  const exclusions = new Map();
  for (const exclusion of scope.jsOnlyTestGroups || []) {
    const id = groupId(exclusion);
    const group = byId.get(id);
    if (!group || invalid.has(id) || !isTestCase(group) || group.name !== exclusion.name
      || typeof exclusion.reason !== 'string' || !exclusion.reason.trim() || exclusions.has(id)) {
      errors.push({id, reason: 'Invalid, duplicate, or stale JS-only source-test exclusion'});
    } else exclusions.set(id, exclusion.reason);
  }
  const excludedFiles = new Set();
  for (const file of scope.v8OnlyTestFiles || []) {
    if (!inventory.some(group => group.file === file) || excludedFiles.has(file)
      || typeof scope.v8OnlyReason !== 'string' || !scope.v8OnlyReason.trim()) {
      errors.push({id: file, reason: 'Invalid, duplicate, or stale JS-only source-file exclusion'});
    } else excludedFiles.add(file);
  }
  const linked = new Map(inventory.map(group => [groupId(group), []]));
  const ordered = [...inventory].sort((a, b) => b.line - a.line);
  for (const fixture of fixtures) {
    for (const id of fixture.covers?.groups || []) {
      if (!byId.has(id)) errors.push({id: fixture.id, reason: `Unknown source-test reference: ${id}`});
      else if (!invalid.has(id)) linked.get(id).push(fixture.id);
    }
    const origin = /^(.*):([1-9][0-9]*)$/.exec(fixture.origin);
    if (origin) {
      // Titles can repeat (including <dynamic>); an assertion belongs to the
      // nearest enclosing declaration, never every same-named test in its file.
      const group = ordered.find(group => group.file === origin[1] && group.line <= Number(origin[2])
        && (group.endLine === undefined || Number(origin[2]) <= group.endLine));
      if (group && !invalid.has(groupId(group)) && group.name === fixture.group) linked.get(groupId(group)).push(fixture.id);
    }
  }
  const groups = inventory.map(group => {
    const id = groupId(group);
    const ids = invalid.has(id) ? [] : linked.get(id);
    const reason = !invalid.has(id) && (excludedFiles.has(group.file) ? scope.v8OnlyReason : exclusions.get(id));
    if (reason && ids.length) errors.push({id, reason: 'Excluded source test still has parity fixture links'});
    return {...group, ...evidence(ids), ...(reason && !ids.length ? {status: 'excluded', reason, fixtures: []} : {})};
  });
  const children = new Map(groups.map(group => [groupId(group), []]));
  for (const group of groups) if (group.parent && !invalid.has(groupId(group))) children.get(group.parent)?.push(group);
  const leaves = group => isTestCase(group) ? [group] : children.get(groupId(group)).flatMap(leaves);
  for (const group of [...groups].sort((a, b) => b.line - a.line)) {
    if (isTestCase(group)) continue;
    const cases = leaves(group);
    const active = cases.filter(test => test.status !== 'excluded');
    group.caseCount = cases.length;
    group.excludedCaseCount = cases.length - active.length;
    group.verifiedCaseCount = active.filter(test => test.status === 'parity-passed-fixtures').length;
    group.uncoveredCaseCount = active.filter(test => test.status === 'uncovered').length;
    const descendants = children.get(groupId(group));
    if (invalid.has(groupId(group))) continue;
    if (group.status === 'excluded' && descendants.every(test => test.status === 'excluded')) continue;
    delete group.reason;
    const ownFixtures = group.fixtures;
    Object.assign(group, evidence([...ownFixtures, ...descendants.flatMap(test => test.fixtures)]));
    if (descendants.length && descendants.every(test => test.status === 'excluded') && !ownFixtures.length) {
      group.status = 'excluded';
      group.reason = 'All descendant source-test cases are explicitly excluded.';
    } else if (group.status === 'observed-failure' || descendants.some(test => test.status === 'observed-failure')) group.status = 'observed-failure';
    else if (!descendants.length) group.status = 'uncovered';
    else if (!active.length || descendants.some(test => !['parity-passed-fixtures', 'excluded'].includes(test.status))) {
      if (group.status === 'parity-passed-fixtures') group.status = 'partially-verified';
    }
  }
  const summarize = entries => ({
    total: entries.length,
    excluded: entries.filter(entry => entry.status === 'excluded').length,
    parityVerified: entries.filter(entry => entry.status === 'parity-passed-fixtures').length,
    uncovered: entries.filter(entry => entry.status === 'uncovered').length,
    unverified: entries.filter(entry => !['parity-passed-fixtures', 'excluded'].includes(entry.status)).length,
  });
  return {
    groups, errors,
    summary: {
      testCases: summarize(groups.filter(isTestCase)),
      suites: summarize(groups.filter(group => !isTestCase(group))),
      countSemantics: 'Source it declarations counted once. Suites are separate rollups, not additional behaviors; dynamic declarations may represent multiple executions.',
    },
  };
}
