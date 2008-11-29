#!/usr/bin/env ruby1.9

class HSPTestRunner
  TestResult = Struct.new(:tests_count, :assertions_count, :errors_count, :failures_count, :messages)
  
  def initialize
    @hspcmp = 'hspcmp'
    @hsp3cl = 'hsp3cl'
    @tmp_path = '_tmp.hsp'
    @obj_path = '_tmp.ax'
  end
  
  def delete_tmp_files
    [@tmp_path, @obj_path].each do |path|
      begin
        File.delete(path)
      rescue Errno::ENOENT
      end
    end
  end

  def write_to_tmp_script(src_file)
    open(@tmp_path, 'wb') do |f|
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
        message = IO.popen([*@hspcmp, "-o#{@obj_path}", '-d', @tmp_path], 'rb:cp932') {|io| io.read }
        succeeded_compile = $?.exitstatus == 0
        unless succeeded_compile
          abort message
        end
        IO.popen([*@hsp3cl, @obj_path], 'rb:cp932') do |io|
          run_test(src_path, result, io)
        end
      end
    end
    puts
  ensure
    delete_tmp_files
  end
  
  def run_test(src_path, result, io)
    line = (io.gets || '').chomp
    tag = nil
    unless /\A##START TEST:(.+)/.match(line)
      raise 'invalid output: %p' % line
    else
      tag = $1
    end
    result.tests_count += 1
    error_regexp = /\A##ERROR OCCURRED:#{Regexp.escape(tag)}:(\d+):(\d+)\z/
    status = '.'
    loop do
      until io.eof?
        case io.gets.chomp
        when "##NEXT ASSERT:#{tag}"
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
      when /\Afail\(line:(\d+)\)\z/
        lineno = $1.to_i
        message = "#{src_path}:#{lineno}: failed "
        message << io.read
        status = 'F'
        result.messages << message
        result.failures_count += 1
        break
      when /\Aerror: (\d+):(\d+)\z/
        expected_errno = $1.to_i
        lineno = $2.to_i
        if error_regexp =~ (io.gets || '').chomp
          if expected_errno != $1.to_i
            status = 'E'
            errno = $1.to_i
            lineno = $2.to_i
            result.messages << "#{src_path}:#{lineno}: error #{errno}"
            result.errors_count += 1
          end
        else
          message = "#{src_path}:#{lineno}: failed assert_error\n"
          status = 'F'
          result.failures_count += 1
        end
        break
      else
        raise 'invalid output: %p' % line
      end
    end
    print status
  end
end

HSPTestRunner.new.run Dir.glob('test_*.hsp')
