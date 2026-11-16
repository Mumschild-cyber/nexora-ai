document.addEventListener('DOMContentLoaded', function () {
  const emailPattern = /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+$/i;
  const namePattern = /^[\p{L}\p{M}][\p{L}\p{M}'’.-]*(?:[ \t]+[\p{L}\p{M}][\p{L}\p{M}'’.-]*)*$/u;
  const reservedDomains = new Set(['example.com', 'example.net', 'example.org']);
  const reservedTopLevelDomains = new Set(['example', 'invalid', 'localhost', 'test']);
  const config = window.NEXORA_AI_SUPABASE_CONFIG;
  const supabaseSdk = window.supabase;
  const configurationIsValid =
    config &&
    typeof config.url === 'string' &&
    typeof config.publishableKey === 'string' &&
    config.url.startsWith('https://') &&
    !config.url.includes('YOUR_PROJECT') &&
    config.publishableKey.length > 10 &&
    !config.publishableKey.includes('YOUR_');
  let supabaseClient = null;
  let supabaseInitializationError = '';

  if (configurationIsValid && supabaseSdk && typeof supabaseSdk.createClient === 'function') {
    try {
      supabaseClient = supabaseSdk.createClient(config.url, config.publishableKey, {
        auth: {
          autoRefreshToken: true,
          detectSessionInUrl: true,
          flowType: 'pkce',
          persistSession: true,
        },
      });
    } catch (error) {
      supabaseInitializationError = error instanceof Error ? error.message : 'Invalid Supabase configuration.';
    }
  }

  function getEmailError(email) {
    const trimmedEmail = email.trim();
    const parts = trimmedEmail.split('@');
    const localPart = parts[0] || '';
    const domain = parts[1] || '';
    const topLevelDomain = domain.split('.').pop() || '';

    if (
      !emailPattern.test(trimmedEmail) ||
      localPart.length > 64 ||
      trimmedEmail.length > 254 ||
      !/^(?:[A-Z]{2,63}|XN--[A-Z0-9-]{2,59})$/i.test(topLevelDomain)
    ) {
      return 'Enter a valid email address, like you@example.com.';
    }

    if (localPart.startsWith('.') || localPart.endsWith('.') || localPart.includes('..')) {
      return 'Check the dots in your email address.';
    }

    if (domain.startsWith('.') || domain.endsWith('.') || domain.includes('..')) {
      return 'Check the domain in your email address.';
    }

    if (
      reservedTopLevelDomains.has(topLevelDomain.toLowerCase()) ||
      Array.from(reservedDomains).some(function (reservedDomain) {
        return domain.toLowerCase() === reservedDomain || domain.toLowerCase().endsWith('.' + reservedDomain);
      })
    ) {
      return 'That domain is reserved for examples. Enter an email address you can access.';
    }

    return '';
  }

  function getPasswordRules(password) {
    return {
      length: password.length >= 12 && password.length <= 128,
      lower: /[a-z]/.test(password),
      upper: /[A-Z]/.test(password),
      number: /\d/.test(password),
      symbol: /[^A-Za-z0-9]/.test(password),
    };
  }

  function getPasswordError(password) {
    const rules = getPasswordRules(password);

    if (!rules.length) return 'Use a password between 12 and 128 characters.';
    if (!rules.lower || !rules.upper || !rules.number || !rules.symbol) {
      return 'Include uppercase and lowercase letters, a number, and a symbol.';
    }

    return '';
  }

  function setStatus(status, message, kind) {
    if (!status) return;

    status.textContent = message;
    if (kind) {
      status.dataset.kind = kind;
    } else {
      delete status.dataset.kind;
    }
  }

  function getSupabaseClient(status) {
    if (!configurationIsValid) {
      setStatus(
        status,
        'Add your Supabase project URL and publishable key to supabase-config.js to enable account access.',
        'error',
      );
      return null;
    }

    if (!supabaseSdk || typeof supabaseSdk.createClient !== 'function') {
      setStatus(status, 'The Supabase sign-in service could not load. Check your internet connection and try again.', 'error');
      return null;
    }

    if (supabaseInitializationError || !supabaseClient) {
      setStatus(status, supabaseInitializationError || 'Supabase could not be initialized. Check your project settings.', 'error');
      return null;
    }

    return supabaseClient;
  }

  function getAuthErrorMessage(error) {
    if (error && typeof error.message === 'string' && error.message.trim()) {
      return error.message;
    }

    return 'We could not complete that request. Please try again.';
  }

  function getPageUrl(pageName) {
    return new URL(pageName, window.location.href).href;
  }

  function getPolicyUrl(policyName) {
    const policyPath = config && config[policyName];
    if (typeof policyPath !== 'string' || !policyPath.trim()) return null;

    try {
      const policyUrl = new URL(policyPath, window.location.href);
      if (policyUrl.protocol === 'https:' || policyUrl.origin === window.location.origin) {
        return policyUrl.href;
      }
    } catch {
      return null;
    }

    return null;
  }

  function hasPublishedPolicies() {
    return Boolean(
      config &&
      config.policiesApproved === true &&
      getPolicyUrl('termsUrl') &&
      getPolicyUrl('privacyUrl'),
    );
  }

  document.querySelectorAll('[data-current-year]').forEach(function (yearElement) {
    yearElement.textContent = String(new Date().getFullYear());
  });

  document.querySelectorAll('[data-password-toggle]').forEach(function (toggle) {
    toggle.addEventListener('click', function () {
      const passwordInput = document.getElementById(toggle.dataset.passwordToggle);
      if (!passwordInput) return;

      const shouldShow = passwordInput.type === 'password';
      passwordInput.type = shouldShow ? 'text' : 'password';
      toggle.textContent = shouldShow ? 'Hide' : 'Show';
      toggle.setAttribute('aria-label', (shouldShow ? 'Hide ' : 'Show ') + (passwordInput.labels[0]?.textContent || 'password').replace('*', '').trim());
      toggle.setAttribute('aria-pressed', String(shouldShow));
      passwordInput.focus();
    });
  });

  document.querySelectorAll('[data-policy-open]').forEach(function (button) {
    button.addEventListener('click', function () {
      const policyUrl = getPolicyUrl(button.dataset.policyOpen === 'terms-dialog' ? 'termsUrl' : 'privacyUrl');
      if (policyUrl) {
        window.open(policyUrl, '_blank', 'noopener,noreferrer');
        return;
      }

      const dialog = document.getElementById(button.dataset.policyOpen);
      if (dialog && typeof dialog.showModal === 'function') {
        dialog.showModal();
      }
    });
  });

  document.querySelectorAll('[data-google-sign-in]').forEach(function (button) {
    button.addEventListener('click', async function () {
      const status = document.querySelector('[data-form-status]');
      const signupForm = document.querySelector('[data-auth-form="signup"]');
      if (signupForm) {
        if (!hasPublishedPolicies()) {
          setStatus(status, 'Sign-up is paused until the Terms of Service and Privacy Policy are published.', 'error');
          return;
        }

        const termsAccepted = signupForm.elements.namedItem('acceptTerms');
        const ageConfirmed = signupForm.elements.namedItem('confirmAge');
        if (!termsAccepted.checked || !ageConfirmed.checked) {
          setStatus(status, 'Agree to the policies and confirm that you are at least 16 to create an account.', 'error');
          (termsAccepted.checked ? ageConfirmed : termsAccepted).focus();
          return;
        }
      }

      const client = getSupabaseClient(status);
      if (!client) return;

      button.disabled = true;
      try {
        const { error } = await client.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: getPageUrl('auth-callback.html'),
          },
        });

        if (error) {
          setStatus(status, getAuthErrorMessage(error), 'error');
        }
      } catch {
        setStatus(status, 'Google sign-in could not be started. Please try again.', 'error');
      } finally {
        button.disabled = false;
      }
    });
  });

  document.querySelectorAll('[data-auth-form]').forEach(function (form) {
    const action = form.dataset.authForm;
    const status = form.querySelector('[data-form-status]');
    const emailInput = form.elements.namedItem('email');
    const passwordInput = form.elements.namedItem('password');
    const confirmInput = form.elements.namedItem('confirmPassword');
    const nameInput = form.elements.namedItem('name');
    const submitButton = form.querySelector('[type="submit"]');

    function validateEmail() {
      if (!emailInput) return true;

      emailInput.value = emailInput.value.trim();
      emailInput.setCustomValidity(getEmailError(emailInput.value));
      return emailInput.checkValidity();
    }

    function validateName() {
      if (!nameInput) return true;

      nameInput.value = nameInput.value.trim();
      const validName = namePattern.test(nameInput.value) && nameInput.value.length <= 80;
      nameInput.setCustomValidity(validName ? '' : 'Enter a name using letters, spaces, apostrophes, or hyphens.');
      return nameInput.checkValidity();
    }

    function validatePassword() {
      if (!passwordInput) return true;

      const passwordError = action === 'signup' || action === 'update-password'
        ? getPasswordError(passwordInput.value)
        : '';
      passwordInput.setCustomValidity(passwordError);

      if (confirmInput) {
        confirmInput.setCustomValidity(
          confirmInput.value && confirmInput.value !== passwordInput.value
            ? 'The passwords do not match.'
            : '',
        );
      }

      return passwordInput.checkValidity() && (!confirmInput || confirmInput.checkValidity());
    }

    function updatePasswordRules() {
      if (!passwordInput) return;

      const rules = getPasswordRules(passwordInput.value);
      form.querySelectorAll('[data-rule]').forEach(function (ruleElement) {
        ruleElement.classList.toggle('is-met', Boolean(rules[ruleElement.dataset.rule]));
      });
    }

    if (emailInput) {
      emailInput.addEventListener('input', function () {
        emailInput.setCustomValidity('');
        setStatus(status, '');
      });
      emailInput.addEventListener('blur', validateEmail);
    }

    if (nameInput) {
      nameInput.addEventListener('input', function () {
        nameInput.setCustomValidity('');
      });
      nameInput.addEventListener('blur', validateName);
    }

    if (passwordInput) {
      passwordInput.addEventListener('input', function () {
        passwordInput.setCustomValidity('');
        if (confirmInput) confirmInput.setCustomValidity('');
        updatePasswordRules();
      });
    }

    if (confirmInput) {
      confirmInput.addEventListener('input', function () {
        confirmInput.setCustomValidity('');
      });
    }

    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      setStatus(status, '');

      [validateName, validateEmail, validatePassword].forEach(function (validate) {
        validate();
      });

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      if (action === 'signup' && !form.elements.namedItem('acceptTerms').checked) {
        form.elements.namedItem('acceptTerms').focus();
        form.reportValidity();
        return;
      }

      if (action === 'signup' && !form.elements.namedItem('confirmAge').checked) {
        form.elements.namedItem('confirmAge').focus();
        form.reportValidity();
        return;
      }

      if (action === 'signup' && !hasPublishedPolicies()) {
        setStatus(status, 'Sign-up is paused until the Terms of Service and Privacy Policy are published.', 'error');
        return;
      }

      const client = getSupabaseClient(status);
      if (!client) return;

      submitButton.disabled = true;
      submitButton.dataset.originalHtml = submitButton.innerHTML;
      submitButton.textContent = action === 'reset' ? 'Sending request…' : 'Connecting securely…';

      try {
        if (action === 'signup') {
          const { data, error } = await client.auth.signUp({
            email: emailInput.value,
            password: passwordInput.value,
            options: {
              data: { full_name: nameInput.value },
              emailRedirectTo: getPageUrl('auth-callback.html'),
            },
          });

          if (error) {
            setStatus(status, getAuthErrorMessage(error), 'error');
          } else if (data.user && data.session) {
            setStatus(status, 'Your account is ready. You are signed in.', 'success');
          } else {
            setStatus(status, 'Check your inbox for a verification link. Your account is not active until your email is verified.', 'success');
          }
        } else if (action === 'login') {
          const { error } = await client.auth.signInWithPassword({
            email: emailInput.value,
            password: passwordInput.value,
          });

          if (error) {
            setStatus(status, getAuthErrorMessage(error), 'error');
          } else {
            setStatus(status, 'You’re signed in. Your Nexora AI session is ready.', 'success');
          }
        } else if (action === 'reset') {
          const { error } = await client.auth.resetPasswordForEmail(emailInput.value, {
            redirectTo: getPageUrl('update-password.html'),
          });

          if (error) {
            setStatus(status, getAuthErrorMessage(error), 'error');
          } else {
            setStatus(status, 'If an account exists for that address, a password reset link will be sent.', 'success');
          }
        } else if (action === 'update-password') {
          const { error } = await client.auth.updateUser({ password: passwordInput.value });

          if (error) {
            setStatus(status, getAuthErrorMessage(error), 'error');
          } else {
            setStatus(status, 'Your password has been updated. You can now log in with your new password.', 'success');
          }
        }
      } catch {
        setStatus(status, 'We could not reach Supabase. Check your connection and project settings, then try again.', 'error');
      } finally {
        submitButton.disabled = false;
        if (submitButton.dataset.originalHtml) {
          submitButton.innerHTML = submitButton.dataset.originalHtml;
          delete submitButton.dataset.originalHtml;
        }
      }
    });
  });

  const passwordUpdateForm = document.querySelector('[data-auth-form="update-password"]');
  if (passwordUpdateForm) {
    const status = passwordUpdateForm.querySelector('[data-form-status]');
    if (!getSupabaseClient(status)) return;

    supabaseClient.auth.getSession().then(function ({ data, error }) {
      if (error) {
        setStatus(status, getAuthErrorMessage(error), 'error');
      } else if (!data.session) {
        setStatus(status, 'This reset link is missing or has expired. Request a new one to continue.', 'error');
      }
    }).catch(function () {
      setStatus(status, 'We could not verify this reset link. Request a new one and try again.', 'error');
    });
  }

  const callbackStatus = document.querySelector('[data-auth-callback]');
  if (callbackStatus) {
    const client = getSupabaseClient(callbackStatus);
    if (!client) return;

    const primaryLink = document.querySelector('[data-callback-primary]');
    client.auth.getSession().then(function ({ data, error }) {
      if (error) {
        setStatus(callbackStatus, getAuthErrorMessage(error), 'error');
        if (primaryLink) {
          primaryLink.href = getPageUrl('login.html');
          primaryLink.firstChild.textContent = 'Go to log in ';
        }
      } else if (data.session) {
        setStatus(callbackStatus, 'Your email is confirmed and your Nexora AI account is ready. You can continue to the website or sign in below.', 'success');
        if (primaryLink) primaryLink.href = getPageUrl('index.html');
      } else {
        setStatus(callbackStatus, 'We couldn’t confirm this link. It may have expired, or it may have been opened in a different browser. Request a new confirmation email and open it in the same browser where you signed up.', 'error');
        if (primaryLink) {
          primaryLink.href = getPageUrl('login.html');
          primaryLink.firstChild.textContent = 'Go to log in ';
        }
      }
    }).catch(function () {
      setStatus(callbackStatus, 'We couldn’t confirm this link. Check your connection, then request a new confirmation email if the problem continues.', 'error');
      if (primaryLink) {
        primaryLink.href = getPageUrl('login.html');
        primaryLink.firstChild.textContent = 'Go to log in ';
      }
    });
  }
});
