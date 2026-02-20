/**
 * middleware/validate.js
 * ─────────────────────────────────────────────────────────
 * Factory that returns an Express middleware which validates
 * req.body against a given Joi schema.
 *
 * Returns 422 with a structured error list on failure.
 *
 * Usage:
 *   router.post('/', validate(mySchema), handler)
 */

function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,   // collect ALL errors, not just the first
      stripUnknown: true,  // silently drop extra fields
    });

    if (error) {
      const details = error.details.map((d) => d.message);
      return res.status(422).json({
        success: false,
        error: { code: 'VALIDATION_001', message: 'Validation failed', details },
      });
    }

    req.body = value; // use the sanitised/coerced value
    next();
  };
}

module.exports = validate;
