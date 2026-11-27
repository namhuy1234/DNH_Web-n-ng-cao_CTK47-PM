namespace CulinaryBlog.Domain.Exceptions;

public static class ErrorCodes
{
    public const string ValidationError = "VALIDATION_ERROR";
    public const string CategoryNotFound = "CATEGORY_NOT_FOUND";
    public const string CategoryNameExists = "CATEGORY_NAME_EXISTS";
    public const string RecipeNotFound = "RECIPE_NOT_FOUND";
    public const string RecipeForbidden = "RECIPE_FORBIDDEN";
    public const string RecipePublishIncomplete = "RECIPE_PUBLISH_INCOMPLETE";
    public const string ConcurrencyConflict = "RECIPE_CONCURRENCY_CONFLICT";
    public const string DuplicateValue = "DUPLICATE_VALUE";
}
