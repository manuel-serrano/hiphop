(setq load-path (cons "INSTALLPREFIX/share/hop/site-lisp" load-path))
(autoload 'hopjs-mode-hook "hopjs" "Hop.js javascript mode hook" t)
(add-hook 'js-mode-hook 'hopjs-mode-hook)
(custom-set-variables '(js-indent-level 3))
