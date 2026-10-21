const test = require("node:test");
const assert = require("node:assert/strict");

const {
  ROUTE_ACTIONS,
  buildOutlookComposeUrl,
  classifyUrl,
  isTrustedRendererUrl,
  parseMailto,
  teamsHttpsFallback,
  toTeamsProtocolUrl,
} = require("../src/controller/url-router");

const OUTLOOK_SOURCE = "https://outlook.cloud.microsoft/mail/inbox";

test("trusted renderer origins use parsed exact hostnames", () => {
  for (const url of [
    "https://outlook.cloud.microsoft/mail",
    "https://outlook.office.com/calendar",
    "https://login.microsoftonline.com/common/oauth2/authorize",
  ]) {
    assert.equal(isTrustedRendererUrl(url), true, url);
  }

  for (const url of [
    "https://outlook.cloud.microsoft.attacker.invalid/mail",
    "https://outlook.cloud.microsoft@evil.invalid/mail",
    "https://evil.invalid/?next=https://outlook.cloud.microsoft/mail",
    "http://outlook.cloud.microsoft/mail",
    "file:///etc/passwd",
    "not a URL",
  ]) {
    assert.equal(isTrustedRendererUrl(url), false, url);
  }
});

test("classifies Outlook, Safe Links, external, and blocked destinations", () => {
  assert.equal(
    classifyUrl("https://outlook.cloud.microsoft/mail/inbox", {
      sourceUrl: OUTLOOK_SOURCE,
    }).action,
    ROUTE_ACTIONS.INTERNAL
  );
  assert.equal(
    classifyUrl(
      "https://outlook.cloud.microsoft/calendar/deeplink/compose?subject=test",
      { sourceUrl: OUTLOOK_SOURCE }
    ).action,
    ROUTE_ACTIONS.INTERNAL_POPUP
  );
  assert.equal(
    classifyUrl(
      "https://nam01.safelinks.protection.outlook.com/?url=https%3A%2F%2Fexample.com",
      { sourceUrl: OUTLOOK_SOURCE }
    ).action,
    ROUTE_ACTIONS.EXTERNAL
  );
  assert.equal(
    classifyUrl("https://example.com/?redirect=https://outlook.cloud.microsoft", {
      sourceUrl: OUTLOOK_SOURCE,
    }).action,
    ROUTE_ACTIONS.EXTERNAL
  );

  for (const url of [
    "javascript:alert(1)",
    "data:text/html,<h1>bad</h1>",
    "file:///etc/passwd",
    "shell:touch%20/tmp/bad",
    "https://user:password@example.com/",
    "https://[invalid",
  ]) {
    assert.equal(
      classifyUrl(url, { sourceUrl: OUTLOOK_SOURCE }).action,
      ROUTE_ACTIONS.BLOCK,
      url
    );
  }
});

test("about:blank and trusted blob popups require a trusted source", () => {
  assert.equal(
    classifyUrl("about:blank", { sourceUrl: OUTLOOK_SOURCE }).action,
    ROUTE_ACTIONS.INTERNAL_POPUP
  );
  assert.equal(
    classifyUrl("about:blank", { sourceUrl: "https://evil.invalid" }).action,
    ROUTE_ACTIONS.BLOCK
  );
  assert.equal(
    classifyUrl("blob:https://outlook.cloud.microsoft/id", {
      sourceUrl: OUTLOOK_SOURCE,
    }).action,
    ROUTE_ACTIONS.INTERNAL_POPUP
  );
  assert.equal(
    classifyUrl("blob:https://evil.invalid/id", { sourceUrl: OUTLOOK_SOURCE })
      .action,
    ROUTE_ACTIONS.BLOCK
  );
});

test("Teams meeting links launch the native protocol only from Outlook", () => {
  const httpsMeeting =
    "https://teams.microsoft.com/l/meetup-join/19%3ameeting_example/0?context=%7B%7D";
  const protocolMeeting =
    "msteams://teams.cloud.microsoft/meet/1234567890123?p=abc";

  assert.equal(
    classifyUrl(httpsMeeting, { sourceUrl: OUTLOOK_SOURCE }).action,
    ROUTE_ACTIONS.TEAMS
  );
  assert.equal(
    classifyUrl(protocolMeeting, { sourceUrl: OUTLOOK_SOURCE }).action,
    ROUTE_ACTIONS.TEAMS
  );
  assert.equal(
    classifyUrl(protocolMeeting, { sourceUrl: "https://evil.invalid" }).action,
    ROUTE_ACTIONS.BLOCK
  );
  assert.equal(
    classifyUrl(protocolMeeting, {
      sourceUrl: "https://login.microsoftonline.com/common/login",
    }).action,
    ROUTE_ACTIONS.BLOCK
  );
  assert.equal(
    classifyUrl("msteams://evil.invalid/l/meetup-join/id", {
      sourceUrl: OUTLOOK_SOURCE,
    }).action,
    ROUTE_ACTIONS.BLOCK
  );
  assert.equal(
    classifyUrl("msteams:/l/chat/0/0?users=victim@example.com", {
      sourceUrl: OUTLOOK_SOURCE,
    }).action,
    ROUTE_ACTIONS.BLOCK
  );

  assert.equal(
    toTeamsProtocolUrl(httpsMeeting),
    "msteams://teams.microsoft.com/l/meetup-join/19%3ameeting_example/0?context=%7B%7D"
  );
  assert.equal(
    teamsHttpsFallback(protocolMeeting),
    "https://teams.cloud.microsoft/meet/1234567890123?p=abc"
  );
});

test("non-meeting Teams HTTPS pages stay in the browser", () => {
  assert.equal(
    classifyUrl("https://teams.microsoft.com/", {
      sourceUrl: OUTLOOK_SOURCE,
    }).action,
    ROUTE_ACTIONS.EXTERNAL
  );
  assert.equal(
    classifyUrl("https://teams.microsoft.com/l/chat/0/0", {
      sourceUrl: OUTLOOK_SOURCE,
    }).action,
    ROUTE_ACTIONS.EXTERNAL
  );
});

test("mailto parser preserves quoted and Unicode values", () => {
  assert.deepEqual(
    parseMailto(
      'mailto:%22Doe%2C%20Jane%22%20%3Cjane%2Btag%40example.com%3E?cc=%E6%B5%8B%E8%AF%95%40example.com&subject=Quarterly%20review&body=Line%201%0D%0ALine%202'
    ),
    {
      to: '"Doe, Jane" <jane+tag@example.com>',
      cc: "测试@example.com",
      bcc: "",
      subject: "Quarterly review",
      body: "Line 1\nLine 2",
    }
  );
});

test("mailto parser keeps literal plus signs and combines repeated recipients", () => {
  assert.deepEqual(
    parseMailto(
      "mailto:user+tag@example.com?to=second%40example.com&cc=one%40example.com&cc=two%40example.com"
    ),
    {
      to: "user+tag@example.com, second@example.com",
      cc: "one@example.com, two@example.com",
      bcc: "",
      subject: "",
      body: "",
    }
  );
});

test("mailto parser rejects malformed, injected, and oversized values", () => {
  for (const url of [
    "https://example.com",
    "mailto:test@example.com?subject=hello%0d%0aBcc%3Avictim%40example.com",
    "mailto:test@example.com?subject=hello%250d%250aBcc%253Avictim%2540example.com",
    "mailto:test%0a@example.com",
    "mailto:test@example.com?cc=other%250aexample.com",
    "mailto:test@example.com?body=%E0%A4%A",
    `mailto:test@example.com?body=${"a".repeat(9000)}`,
  ]) {
    assert.equal(parseMailto(url), null, url.slice(0, 100));
  }
});

test("mailto routing requires a trusted source", () => {
  assert.equal(
    classifyUrl("mailto:test@example.com?subject=Hello", {
      sourceUrl: OUTLOOK_SOURCE,
    }).action,
    ROUTE_ACTIONS.MAILTO
  );
  assert.equal(
    classifyUrl("mailto:test@example.com?subject=Hello", {
      sourceUrl: "https://evil.invalid",
    }).action,
    ROUTE_ACTIONS.BLOCK
  );
  assert.equal(
    classifyUrl("mailto:test@example.com?subject=Hello", {
      sourceUrl: "https://login.microsoftonline.com/common/login",
    }).action,
    ROUTE_ACTIONS.BLOCK
  );
});

test("Outlook compose URL uses URLSearchParams escaping", () => {
  const compose = new URL(
    buildOutlookComposeUrl(
      {
        to: "a+tag@example.com",
        cc: "b@example.com",
        bcc: "",
        subject: "Q&A = ready",
        body: "First line\nSecond line",
      },
      "https://outlook.cloud.microsoft/mail"
    )
  );

  assert.equal(compose.origin, "https://outlook.cloud.microsoft");
  assert.equal(compose.pathname, "/mail/deeplink/compose");
  assert.equal(compose.searchParams.get("to"), "a+tag@example.com");
  assert.equal(compose.searchParams.get("cc"), "b@example.com");
  assert.equal(compose.searchParams.get("subject"), "Q&A = ready");
  assert.equal(compose.searchParams.get("body"), "First line\nSecond line");
});

test("Outlook compose URL rejects an untrusted configured host", () => {
  assert.equal(
    buildOutlookComposeUrl(
      { to: "a@example.com", cc: "", bcc: "", subject: "", body: "" },
      "https://outlook.cloud.microsoft.attacker.invalid/mail"
    ),
    null
  );
});
