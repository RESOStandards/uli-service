const logger = require("logger");
//create jenkins for Cert server using crumbs
const jenkins = require("jenkins")({
  baseUrl:
    "https://cert-api-user:Ra7FfA5dZV9X5Zn2DWAkt2H8@tester.reso.org:8443",
  crumbIssuer: true,
  promisify: true,
});

const startJenkinsJob = async ({
  templateName = "JobTemplates/RESO Data Dictionary 1.7 Reference Metadata",
  recipientUoi,
  providerUoi,
}) => {
  try {
    const jobName =
      "Sandbox/Data Dictionary 1.7 - Provider " +
      recipientUoi +
      " - Recipient " +
      recipientUoi +
      " - (" +
      new Date().getTime() +
      ")";
    await jenkins.job.copy(templateName, jobName);
    //disable job to trigger save
    await jenkins.job.disable(jobName);
    //reenable job to activate
    await jenkins.job.enable(jobName);
    //start build
    const queueItemNumber = await jenkins.job.build({
      name: jobName,
      parameters: { RECIPIENT_UOI: recipientUoi, PROVIDER_UOI: providerUoi },
    });

    return queueItemNumber;
  } catch (error) {
    logger.error(
      `Error while fetching fields by search in Elastic Service`,
      JSON.stringify(error)
    );
    return Promise.reject(error);
  }
};

module.exports = {
  startJenkinsJob,
};
