namespace Nebula.Shared.Kernel;

public enum ErrorType { Validation, NotFound, Forbidden, Conflict }

public sealed record Error(string Code, string Message, ErrorType Type = ErrorType.Validation)
{
    public static readonly Error None = new("", "");
    public static Error NotFound(string code, string msg) => new(code, msg, ErrorType.NotFound);
    public static Error Forbidden(string code, string msg) => new(code, msg, ErrorType.Forbidden);
    public static Error Conflict(string code, string msg) => new(code, msg, ErrorType.Conflict);
}

public class Result
{
    protected Result(bool ok, Error error) { IsSuccess = ok; Error = error; }
    public bool IsSuccess { get; }
    public bool IsFailure => !IsSuccess;
    public Error Error { get; }

    public static Result Success() => new(true, Error.None);
    public static Result Failure(Error error) => new(false, error);
    public static Result<T> Success<T>(T value) => new(value, true, Error.None);
    public static Result<T> Failure<T>(Error error) => new(default, false, error);
}

public sealed class Result<T> : Result
{
    private readonly T? _value;
    internal Result(T? value, bool ok, Error error) : base(ok, error) => _value = value;
    public T Value => IsSuccess ? _value! : throw new InvalidOperationException("Result thất bại, không có Value.");

    public static implicit operator Result<T>(Error error) => Failure<T>(error);
}
