import * as React from "react";

export function useForm(initialValues = {}) {
  const formRef = React.useRef();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    console.log("useForm.useEffect called!");

    for (const key of formRef.current.elements) {
      if (key.name in initialValues) {
        key.value = initialValues[key.name];
      }
    }
  }, [initialValues]);

  const onSubmit = (cb) => {
    return async (event) => {
      event.preventDefault();

      setIsSubmitting(true);

      const submitted = {};
      const formData = new FormData(formRef.current);

      for (const [key, value] of formData.entries()) {
        submitted[key] = value;
      }

      await cb(submitted);
      setIsSubmitting(false);
    };
  };

  const getFormProps = (...props) => {
    return { ...props, ref: formRef };
  };

  return {
    isSubmitting,
    getFormProps,
    onSubmit: onSubmit,
  };
}
