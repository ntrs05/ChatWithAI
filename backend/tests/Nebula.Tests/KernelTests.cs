using Nebula.Shared.Kernel;

namespace Nebula.Tests;

// Test cho phần dùng chung. Test của module nào thì tạo file riêng, vd UserTests.cs.
public class KernelTests
{
    [Fact]
    public void Success_has_no_error()
    {
        var r = Result.Success();
        Assert.True(r.IsSuccess);
        Assert.Equal(Error.None, r.Error);
    }

    [Fact]
    public void Failure_keeps_error_and_hides_value()
    {
        var r = Result.Failure<int>(Error.NotFound("user.not_found", "Không tìm thấy"));
        Assert.True(r.IsFailure);
        Assert.Equal(ErrorType.NotFound, r.Error.Type);
        Assert.Throws<InvalidOperationException>(() => r.Value);
    }
}
