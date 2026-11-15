document.addEventListener('DOMContentLoaded', function () {
  const menuToggle = document.getElementById('menu-toggle');
  const navigation = document.getElementById('primary-navigation');
  const mobileViewport = window.matchMedia('(max-width: 860px)');

  function setMenuOpen(open) {
    if (!menuToggle || !navigation) return;

    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    navigation.classList.toggle('is-open', open);
    navigation.setAttribute('aria-hidden', String(mobileViewport.matches && !open));
    document.body.classList.toggle('menu-open', open && mobileViewport.matches);
  }

  if (menuToggle && navigation) {
    setMenuOpen(false);

    menuToggle.addEventListener('click', function () {
      setMenuOpen(menuToggle.getAttribute('aria-expanded') !== 'true');
    });

    navigation.addEventListener('click', function (event) {
      if (event.target.closest('a') && mobileViewport.matches) {
        setMenuOpen(false);
      }
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && menuToggle.getAttribute('aria-expanded') === 'true') {
        setMenuOpen(false);
        menuToggle.focus();
      }
    });

    document.addEventListener('click', function (event) {
      if (
        mobileViewport.matches &&
        menuToggle.getAttribute('aria-expanded') === 'true' &&
        !navigation.contains(event.target) &&
        !menuToggle.contains(event.target)
      ) {
        setMenuOpen(false);
      }
    });

    mobileViewport.addEventListener('change', function () {
      setMenuOpen(false);
    });
  }

  const currentYear = document.getElementById('current-year');
  if (currentYear) {
    currentYear.textContent = String(new Date().getFullYear());
  }
});
