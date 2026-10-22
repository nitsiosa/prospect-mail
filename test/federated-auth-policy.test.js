const test = require("node:test");
const assert = require("node:assert/strict");

const {
  FederatedAuthPolicy,
} = require("../src/controller/federated-auth-policy");

test("allows a bounded HTTPS federation chain initiated by Microsoft login", () => {
  const policy = new FederatedAuthPolicy();
  const contentsId = 7;

  assert.equal(
    policy.allows({
      contentsId,
      sourceUrl: "https://login.microsoftonline.com/common/login",
      destinationUrl: "https://sso.example-corporation.test/saml",
      isRedirect: true,
    }),
    true
  );
  assert.equal(
    policy.allows({
      contentsId,
      sourceUrl: "https://sso.example-corporation.test/saml",
      destinationUrl: "https://sso.example-corporation.test/mfa",
      isRedirect: false,
    }),
    true
  );
  assert.equal(
    policy.allows({
      contentsId,
      sourceUrl: "https://sso.example-corporation.test/mfa",
      destinationUrl: "https://auth.example-corporation.test/complete",
      isRedirect: true,
    }),
    true
  );
});

test("does not expand federation on clicks, HTTP, credentials, or untrusted starts", () => {
  const policy = new FederatedAuthPolicy();

  for (const request of [
    {
      contentsId: 1,
      sourceUrl: "https://login.microsoftonline.com/common/login",
      destinationUrl: "https://unrelated.example/",
      isRedirect: false,
    },
    {
      contentsId: 1,
      sourceUrl: "https://login.microsoftonline.com/common/login",
      destinationUrl: "http://sso.example.test/",
      isRedirect: true,
    },
    {
      contentsId: 1,
      sourceUrl: "https://login.microsoftonline.com/common/login",
      destinationUrl: "https://user:password@sso.example.test/",
      isRedirect: true,
    },
    {
      contentsId: 2,
      sourceUrl: "https://evil.invalid/",
      destinationUrl: "https://sso.example.test/",
      isRedirect: true,
    },
  ]) {
    assert.equal(policy.allows(request), false);
  }
});

test("clearing a web contents removes its learned federation hosts", () => {
  const policy = new FederatedAuthPolicy();
  const request = {
    contentsId: 9,
    sourceUrl: "https://login.microsoftonline.com/common/login",
    destinationUrl: "https://sso.example.test/login",
    isRedirect: true,
  };
  assert.equal(policy.allows(request), true);
  policy.clear(9);
  assert.equal(
    policy.allows({
      ...request,
      sourceUrl: "https://sso.example.test/login",
      destinationUrl: "https://sso.example.test/mfa",
      isRedirect: false,
    }),
    false
  );
});
