

(function() {
  'use strict';

  console.log('Injected script running in page context');

  // Normalize language codes to proper display names
  function normalizeLanguage(lang) {
    const languageNames = {
      cpp: 'C++',
      python3: 'Python',
      javascript: 'JavaScript',
      typescript: 'TypeScript',
      csharp: 'C#',
      golang: 'Go'
    };
    return languageNames[lang] || lang;
  }

  let pendingSubmission = null;
  const originalFetch = window.fetch;
  
  // Override fetch
  window.fetch = async function(...args) {
    const [url, options] = args;
    
    // Log every fetch call
    console.log('🌐 FETCH INTERCEPTED:', url);
    
    // Call original fetch
    const response = await originalFetch.apply(this, args);
    
    // Check for submit
    if (url.includes('submit/') && !url.includes('submissions/')) {
      console.log('🚀 ========== SUBMIT DETECTED ==========');
      console.log('URL:', url);
      
      const clonedResponse = response.clone();
      
      try {
        let requestData = null;
        if (options?.body) {
          requestData = JSON.parse(options.body);
          console.log('📝 Language:', requestData.lang);
          console.log('📝 Question ID:', requestData.question_id);
          console.log('📝 Code (first 100 chars):', requestData.typed_code?.substring(0, 100));
        }
        
        const responseData = await clonedResponse.json();
        console.log('✅ Response:', responseData);
        
        if (responseData.submission_id) {
          pendingSubmission = {
            submissionId: responseData.submission_id,
            language: normalizeLanguage(requestData?.lang) || 'unknown',
            code: requestData?.typed_code || 'unknown',
            questionId: requestData?.question_id || 'unknown',
            problemUrl: window.location.href,
            problemTitle: extractProblemTitle()
          };
          
          console.log('💾 Stored submission');
          
          // Dispatch custom event to content script
          window.dispatchEvent(new CustomEvent('leetcodeSubmission', {
            detail: pendingSubmission
          }));
        }
      } catch (e) {
        console.error('Error:', e);
      }
      
      console.log('======================================');
    }
    
    // Check for results
    if (url.includes('check/')) {
      console.log('🔍 Check detected');
      
      const clonedResponse = response.clone();
      
      try {
        const responseData = await clonedResponse.json();
        
        if (responseData.state === 'SUCCESS' && 
            responseData.status_msg === 'Accepted' && 
            pendingSubmission) {
          
          console.log('🎉 ========== ACCEPTED! ==========');
          
          const submissionData = {
            ...pendingSubmission,
            timestamp: new Date().toISOString(),
            status: responseData.status_msg
          };
          
          console.log('Sending to extension');
          
          // Dispatch to content script
          window.dispatchEvent(new CustomEvent('leetcodeAccepted', {
            detail: submissionData
          }));
          
          pendingSubmission = null;
        }
      } catch (e) {
        console.error('Error:', e);
      }
    }
    
    return response;
  };
  
  function extractProblemTitle() {
    const match = window.location.pathname.match(/\/problems\/([^\/]+)/);
    if (match) {
      return match[1].split('-').map(w => 
        w.charAt(0).toUpperCase() + w.slice(1)
      ).join(' ');
    }
    return 'Unknown Problem';
  }
  
  console.log('✅ Fetch override installed in page context!');
})();