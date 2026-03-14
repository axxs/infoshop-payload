import type { Block } from 'payload'

export const FormBlock: Block = {
  slug: 'formBlock',
  labels: {
    singular: 'Form',
    plural: 'Forms',
  },
  fields: [
    {
      name: 'formType',
      type: 'select',
      required: true,
      defaultValue: 'contact',
      options: [{ label: 'Contact Form', value: 'contact' }],
      admin: {
        description: 'Type of form to display (more types coming soon)',
        hidden: true,
      },
    },
    {
      name: 'title',
      type: 'text',
      admin: {
        description: 'Optional title override (defaults to form type name)',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      admin: {
        description: 'Optional description text above the form',
      },
    },
    {
      name: 'showContactInfo',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Show contact info sidebar (email, address, social links)',
        condition: (_, siblingData) => siblingData?.formType === 'contact',
      },
    },
  ],
}
