/**
 * cropQualityService.js
 * 
 * This is a clean service boundary for the AI Computer Vision component.
 * Currently returns mock responses based on basic heuristics or random chance,
 * so that it can be dropped in for a real model later without rewriting the Deal workflow.
 * 
 * IMPORTANT: We DO NOT fake a "Verified" status here. We only return "PASSED" or "FLAGGED"
 * to proceed to the Human Verification stage as per the SAATHI specification.
 */

exports.analyzePhotos = async (imageUrls) => {
  // Enforce minimum 5 photos
  if (!imageUrls || imageUrls.length < 5) {
    return {
      passed: false,
      findings: 'Insufficient photos uploaded. Minimum 5 photos are required for AI screening.',
    };
  }

  // Simulate AI processing delay
  await new Promise(resolve => setTimeout(resolve, 2000));

  // For demo purposes, we will pass ~80% of the time.
  // In a real implementation, this would send Base64 data to an ML endpoint.
  const isPass = Math.random() > 0.2;

  if (isPass) {
    return {
      passed: true,
      findings: 'No moisture or visible damage detected. Ready for human field verification.',
    };
  } else {
    return {
      passed: false,
      findings: 'POTENTIAL QUALITY ISSUE DETECTED: Possible moisture or discoloration detected in uploaded photos. Please dry the crop and upload new photos.',
    };
  }
};
