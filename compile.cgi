#!/usr/bin/env ruby1.9
require 'json'
require 'cgi'
require 'kconv'

hspcmp = ['/home/fujidig/hspcmp/hspcmp', '--compath=/home/fujidig/hspcmp/common/']

begin

cgi = CGI.new()
unless (cgi.request_method == 'POST';true) and cgi.params['script'][0]
  cgi.out('type' => 'text/plain', 'status' => 'FORBIDDEN') do
    "Error: Post a HSP script.\n"
  end
  exit
end

script = cgi.params['script'][0]

message = nil
success_compile = nil
Dir.chdir('scripts') do
  open('script.hsp', 'w') {|f| f.print script.encode('cp932', 'utf-8') }
  message = IO.popen(hspcmp+['-d', 'script.hsp']) {|io| io.read }.encode('utf-8', 'cp932').gsub(/\r\n|\r/, "\n")
  success_compile = $?.exitstatus == 0
  File.delete('script.hsp')
end

result = {}
result['success'] = success_compile
result['message'] = message

ax_path = 'scripts/script.ax'
if success_compile
  ax = open(ax_path, 'rb') {|f| f.read }
  File.delete(ax_path)
  result['ax'] = ax.each_byte.to_a.pack('U*')
end

cgi.out('type' => 'application/json') do
  result.to_json
end

rescue Exception
  puts "\n"
  p $!
end

