<template>
  <div class="bg-gray-50">
    <div class="mx-auto max-w-screen-lg py-16">
      <h1>Privacy Policy</h1>
      <p>Effective Date: 30-08-2023 (DD-MM-YYYY)</p>
      <p>
        Thank you for using Lawnotation (“we,” “our”, “us”, or “our platform”). To best
        protect your privacy, the only personal information we collect is your email
        address. This Privacy Policy explains how we collect, use, disclose, and safeguard
        your email address and other non-personal data when you access or use our online
        platform. By accessing or using our platform, you consent to the terms of this
        Privacy Policy.
      </p>
      <h2>Information We Collect</h2>
      <p>
        We collect your email address when you voluntarily provide it to us through our
        platform by signing up for an account. We do not collect any other personally
        identifiable information.
      </p>
      <p>
        All other data collected is related to the use of Lawnotation itself. This data is
        related to, but not limited to, projects, documents, tasks, assignments, label
        sets, and annotations.
      </p>
      <h2>How We Store Your Data</h2>
      <p>
        Your email address and other non-personal data is stored into a secured
        third-party database with whom we have signed a DPA (Data Processing Adendum). By
        default this third-party does not have access to the content (including your email
        address) of the database.
      </p>
      <h2>How We Use Your Email Address</h2>
      <p>We use the email addresses we collect for the following purposes:</p>
      <p>
        <strong>Sending login emails:</strong> when you login on our platform using your
        email address for the first time, we automatically create an account for you using
        your email address and send you an email with a link to login on our platform.
        After we have created an account using your email address, every time you login
        using your email address we send an email with a link to login on our platform.
      </p>
      <p>
        <strong>Creating an account for you:</strong> to keep track of all the projects,
        tasks, and annotations that belong to your user account.
      </p>
      <p>
        <strong>Notifying you on any data breaches:</strong> in case of any data breach –
        such as your email address or any of your data stored on the Lawnotation platform
        – we will use your email address to notify you about the situation as per Article
        33 of the GDPR.
      </p>
      <p>
        <strong>Sending newsletters:</strong> if you opt-in to our newsletter, we will use
        your email address to send you updates and promotional content about the
        Lawnotation platform, no more than once per week. Subscribing to our newsletter is
        optional and voluntary. You can unsubscribe at any time.
      </p>
      <h2>Disclosure of Your Email Address</h2>
      <p>
        We do not sell, trade, or otherwise transfer your email address to outside
        parties. We may, however, share your email address with a trusted third-party
        service provider to help us with email delivery services. This third party is
        obligated to keep your information confidential and secure.
      </p>
      <p>
        Whenever another user adds you to a project on Lawnotation, all members of the
        project will be able to see your email address. Whenever you create a project on
        Lawnotation and invite other users, all invited members will be able to see your
        email address.
      </p>
      <h2>Access to Your Data</h2>
      <p>
        You have access to all the data you create on Lawnotation. If you are a team
        member on a project, the project owner will also have access to your data such as
        annotations, relations, confidence scores etc.
      </p>
      <p>
        The developers of Lawnotation have access to your data limited to development and
        debugging purposes only.
      </p>
      <h2>Data Security</h2>
      <p>
        We use industry-standard security measures to protect your email address and other
        data from unauthorized access, alteration, disclosure, or destruction. However, no
        method of transmission over the internet or electronic storage is completely
        secure, and we cannot guarantee the absolute security of your information.
      </p>
      <h2>Your Rights</h2>
      <p>
        You have the right to access the personal information we hold about you and to
        request that we correct, update, or delete it.
      </p>
      <h2>Changes to this Privacy Policy</h2>
      <p>
        We may update this Privacy Policy from time to time to reflect changes to our
        practices or for other operational, legal, or regulatory reasons. We will notify
        you of any material changes by posting the updated Privacy Policy on our platform.
        Your continued use of the platform after such changes signifies your acceptance of
        the updated Privacy Policy.
      </p>
      <h2>Contact Us</h2>
      <p>
        If you have any questions, concerns, or requests regarding this Privacy Policy or
        how we handle your email address, please contact us at
        <a href="mailto:biss-devs@maastrichtuniversity.nl"
          >biss-devs@maastrichtuniversity.nl</a
        >.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: "blank",
});
</script>

<style lang="postcss" scoped>
h1 {
  @apply font-bold text-4xl;
}
h2 {
  @apply font-bold text-2xl;
}
p {
  @apply mb-6 mt-2;
}
p + p {
  @apply -mt-2;
}
a {
  @apply underline;
}
</style>
