#!/usr/bin/env ruby1.9

class HSPTestRunner
  TestResult = Struct.new(:tests_count, :assertions_count, :errors_count, :failures_count, :messages)
  
  def initialize(hsp3cl, basedir)
    @hspcmp = 'hspcmp'
    @hsp3cl = hsp3cl
    @basedir = basedir
    @tmp_fname = '_tmp.hsp'
    @obj_fname = '_tmp.ax'
  end
  
  def delete_tmp_files
    [File.join(@basedir, @tmp_fname),
     File.join(@basedir, @obj_fname)].each do |path|
      begin
        File.delete(path)
      rescue Errno::ENOENT
      end
    end
  end

  def write_to_tmp_script(src_file)
    open(File.join(@basedir, @tmp_fname), 'wb') do |f|
      f.print "\n" * src_file.lineno
      src_file.each_line do |line|
        if line.start_with?("----")
          break
        end
        f.puts line
      end
      f.puts 'end'
    end
  end
  
  def run(paths)
    result = TestResult.new(0, 0, 0, 0, [])
    paths.each do |path|
      run_file(result, path)
    end
    unless result.messages.empty?
      puts
      puts result.messages
    end
    puts
    puts "#{result.tests_count} tests, #{result.assertions_count} assertions, " \
         "#{result.failures_count} failures, #{result.errors_count} errors"
  end
  
  def run_file(result, src_path)
    print "#{src_path} "
    open(src_path, 'rb') do |src_file|
      until src_file.eof?
        write_to_tmp_script src_file
        message = nil
        Dir.chdir(@basedir) do
          message = IO.popen([*@hspcmp, "-o#{@obj_fname}", '-d', @tmp_fname], 'rb:cp932') {|io| io.read }
        end
        succeeded_compile = $?.exitstatus == 0
        result.tests_count += 1
        unless succeeded_compile
          result.messages << "#{src_path}: compile error\n"+message.gsub(/^/, '  ')
          result.errors_count += 1
          print 'E'
          next
        end
        IO.popen([*@hsp3cl, File.join(@basedir, @obj_fname)], 'rb') do |io|
          print run_test(src_path, result, io)
        end
      end
    end
    puts
  ensure
    delete_tmp_files
  end
  
  def run_test(src_path, result, io)
    tag = nil
    line = (io.gets || '').chomp
    if /\A##START TEST:(.+)/ =~ line
      tag = $1
    else
      message = "#{src_path}: invalid output:\n"
      message << "#{line}\n#{io.read}".gsub(/^/, '  ')
      result.messages << message.chomp
      return 'E'
    end
    error_regexp = /\A##ERROR OCCURRED:#{Regexp.escape(tag)}:(\d+):(\d+)\z/
    next_regexp = /\A##NEXT ASSERT:#{Regexp.escape(tag)}:(\d+)\z/
    status = '.'
    lineno = nil
    loop do
      until io.eof?
        case io.gets.chomp
        when next_regexp
          lineno = $1.to_i
          break
        when error_regexp
          status = 'E'
          errno = $1.to_i
          lineno = $2.to_i
          result.messages << "#{src_path}:#{lineno}: error #{errno}"
          result.errors_count += 1
        end
      end
      break if io.eof?
      line = (io.gets || '').chomp
      result.assertions_count += 1
      case line
      when 'pass'
        #
      when 'fail'
        lineno = $1.to_i
        message = "#{src_path}:#{lineno}: failed "
        message << io.read
        status = 'F'
        result.messages << message
        result.failures_count += 1
        break
      when /\Aerror: (\d+(?:,\s*\d+)*)\z/
        expected_errnos = $1.split(',').map{|i| i.to_i}
        if error_regexp =~ (io.gets || '').chomp
          unless expected_errnos.include?($1.to_i)
            status = 'E'
            errno = $1.to_i
            lineno = $2.to_i
            result.messages << "#{src_path}:#{lineno}: error #{errno}"
            result.errors_count += 1
          end
        else
          result.messages << "#{src_path}:#{lineno}: failed assert_error\n"
          status = 'F'
          result.failures_count += 1
        end
        break
      else
        result.messages << "#{src_path}:#{lineno}: invalid output: #{line.dump}"
        result.errors_count += 1
        status = 'E'
        break
      end
    end
    status
  end
end

if $0 == __FILE__
  require 'optparse'
  require 'pathname'
  opt = OptionParser.new
  hsp3cl = File.join(Pathname($0).parent.parent, 'shell')
  basedir = File.dirname($0) + '/'
  opt.on('--hsp3cl=COMMAND') {|v| hsp3cl = v}
  opt.parse!(ARGV)
  files = ARGV.size > 0 ? ARGV : Dir.glob(basedir + 'test_*.hsp')
  HSPTestRunner.new(hsp3cl, basedir).run files
end
