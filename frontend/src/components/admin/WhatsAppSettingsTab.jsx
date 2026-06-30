import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, Send, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

const WhatsAppSettingsTab = ({ 
  whatsappSettings,
  whatsappLoading,
  testNumber,
  setTestNumber,
  testLoading,
  testEvent,
  setTestEvent,
  testResult,
  onSettingChange,
  onEventSettingChange,
  onSaveSettings,
  onTestMessage
}) => {
  const eventKeys = Object.keys(whatsappSettings.events || {});
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">WhatsApp Integration</h2>
        <Button 
          onClick={onSaveSettings} 
          disabled={whatsappLoading}
          className="bg-slate-900 hover:bg-slate-800"
          data-testid="save-whatsapp-btn"
        >
          {whatsappLoading ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

      {/* Master Switch */}
      <Card className="border-slate-200 shadow-soft" data-testid="whatsapp-settings-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-6 h-6 text-green-600" />
              <div>
                <CardTitle className="text-lg">Master Switch</CardTitle>
                <p className="text-sm text-slate-500">Enable or disable all WhatsApp notifications globally</p>
              </div>
            </div>
            <Switch
              checked={whatsappSettings.enabled}
              onCheckedChange={(checked) => onSettingChange('enabled', checked)}
              disabled={whatsappLoading}
              data-testid="whatsapp-master-switch"
            />
          </div>
        </CardHeader>
      </Card>

      {whatsappSettings.enabled && (
        <>
          {/* MSG91 Configuration */}
          <Card className="border-slate-200 shadow-soft">
            <CardHeader>
              <CardTitle className="text-lg">MSG91 Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>Integrated WhatsApp Number</Label>
                <Input
                  value={whatsappSettings.integrated_number || ''}
                  onChange={(e) => onSettingChange('integrated_number', e.target.value)}
                  placeholder="918728054145"
                  data-testid="whatsapp-number-input"
                />
                <p className="text-xs text-slate-500">Your MSG91 registered WhatsApp number</p>
              </div>
            </CardContent>
          </Card>

          {/* Event Templates */}
          <Card className="border-slate-200 shadow-soft">
            <CardHeader>
              <CardTitle className="text-lg">Event Templates</CardTitle>
              <p className="text-sm text-slate-500">Configure separate MSG91 templates for each notification event</p>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries(whatsappSettings.events || {}).map(([eventKey, eventConfig]) => (
                <div key={eventKey} className="border border-slate-200 rounded-lg p-4" data-testid={`event-${eventKey}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-semibold text-sm capitalize">
                        {eventKey.replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs text-slate-500">{eventConfig.description}</p>
                    </div>
                    <Switch
                      checked={eventConfig.enabled}
                      onCheckedChange={(checked) => onEventSettingChange(eventKey, 'enabled', checked)}
                      disabled={whatsappLoading}
                    />
                  </div>
                  
                  {eventConfig.enabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Template Name</Label>
                        <Input
                          value={eventConfig.template_name || ''}
                          onChange={(e) => onEventSettingChange(eventKey, 'template_name', e.target.value)}
                          placeholder="your_template_name"
                          className="h-8 text-sm"
                          disabled={whatsappLoading}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Namespace</Label>
                        <Input
                          value={eventConfig.namespace || ''}
                          onChange={(e) => onEventSettingChange(eventKey, 'namespace', e.target.value)}
                          placeholder="73fda5e9_77e9_445f_..."
                          className="h-8 text-sm"
                          disabled={whatsappLoading}
                        />
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs text-slate-500 mt-1">
                          <span className="font-medium">Variables:</span>{' '}
                          {eventConfig.variables?.map((v) => (
                            <code key={v} className="bg-slate-100 px-1 mx-0.5 rounded text-xs">
                              {`{${v}}`}
                            </code>
                          ))}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Test Message */}
          <Card className="border-slate-200 shadow-soft" data-testid="whatsapp-test-card">
            <CardHeader>
              <CardTitle className="text-lg">Test Integration</CardTitle>
              <p className="text-sm text-slate-500">
                Send a real test message to verify your MSG91 + template setup. If a global
                <code className="bg-slate-100 px-1 mx-1 rounded text-xs">WHATSAPP_TEST_NUMBER</code>
                is configured on the server, all messages (including this one) are redirected to it.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                <div className="space-y-1 md:col-span-2">
                  <Label className="text-xs">Pick a template to test</Label>
                  <Select value={testEvent} onValueChange={setTestEvent}>
                    <SelectTrigger data-testid="test-event-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {eventKeys.map((k) => (
                        <SelectItem key={k} value={k}>
                          {k.replace(/_/g, ' ')} — {whatsappSettings.events?.[k]?.template_name || '(no template)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={onTestMessage}
                  disabled={testLoading}
                  className="bg-green-600 hover:bg-green-700"
                  data-testid="send-test-btn"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {testLoading ? 'Sending...' : 'Send Test'}
                </Button>
              </div>
              
              {testResult && (
                <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 text-xs space-y-2" data-testid="test-result-block">
                  <div className="flex items-center gap-2">
                    {testResult.msg91_result?.success
                      ? <CheckCircle2 className="w-4 h-4 text-green-600" />
                      : <XCircle className="w-4 h-4 text-red-600" />}
                    <span className={`font-semibold ${testResult.msg91_result?.success ? 'text-green-700' : 'text-red-700'}`}>
                      MSG91: {testResult.msg91_result?.success ? 'Accepted' : 'Rejected'}
                    </span>
                    {testResult.msg91_result?.response?.request_id && (
                      <span className="text-slate-500">
                        request_id: <code>{testResult.msg91_result.response.request_id}</code>
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="text-slate-500">Event:</span> <code>{testResult.debug?.event_type}</code></div>
                    <div><span className="text-slate-500">Template:</span> <code>{testResult.debug?.template_name || '(empty)'}</code></div>
                    <div><span className="text-slate-500">Namespace:</span> <code className="break-all">{testResult.debug?.namespace || '(empty)'}</code></div>
                    <div><span className="text-slate-500">Integrated #:</span> <code>{testResult.debug?.integrated_number}</code></div>
                    <div><span className="text-slate-500">Master enabled:</span> <code>{String(testResult.debug?.global_enabled)}</code></div>
                    <div><span className="text-slate-500">Event enabled:</span> <code>{String(testResult.debug?.event_enabled)}</code></div>
                    <div><span className="text-slate-500">MSG91 key set:</span> <code>{String(testResult.debug?.msg91_key_configured)}</code></div>
                    <div><span className="text-slate-500">Recipient used:</span> <code>{testResult.debug?.recipient_used}</code></div>
                  </div>
                  {!testResult.msg91_result?.success && (
                    <div className="bg-red-50 border border-red-200 rounded p-2 mt-2">
                      <p className="text-red-700"><AlertTriangle className="inline w-3 h-3 mr-1" />MSG91 error:</p>
                      <pre className="whitespace-pre-wrap text-red-800">{typeof testResult.msg91_result?.error === 'string' ? testResult.msg91_result.error : JSON.stringify(testResult.msg91_result?.error, null, 2)}</pre>
                    </div>
                  )}
                  {testResult.msg91_result?.success && (
                    <div className="bg-amber-50 border border-amber-200 rounded p-2 mt-1 text-amber-800">
                      <AlertTriangle className="inline w-3 h-3 mr-1" />
                      MSG91 accepted the request. If you don't receive the WhatsApp message,
                      it usually means: (1) the template isn't <b>Approved</b> on MSG91, or
                      (2) the namespace/integrated-number doesn't match your MSG91 account.
                      Check the MSG91 dashboard → Delivery Reports → search by request_id.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default WhatsAppSettingsTab;
